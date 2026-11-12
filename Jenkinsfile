// ShopSphere CI/CD pipeline
// Triggered by: a GitHub push (webhook, with polling as backup) OR the "Deploy Now" button on the control panel.
// Flow: Checkout -> Test -> Build Image -> Push Image (Docker Hub) -> Deploy (Kubernetes) -> Health Check

def isDeploy() { return (params.ACTION ?: 'deploy') == 'deploy' }

pipeline {
  agent any

  parameters {
    choice(name: 'ACTION', choices: ['deploy', 'rollback'],
           description: 'deploy = test, build and release the latest code. rollback = return to the previous version.')
  }

  triggers {
    githubPush()               // GitHub webhook -> http://<server-ip>:8080/github-webhook/
    pollSCM('H/5 * * * *')     // backup: check GitHub every 5 minutes
  }

  options {
    skipDefaultCheckout()      // we check out in our own "Checkout" stage
    disableConcurrentBuilds()  // one deployment at a time
    buildDiscarder(logRotator(numToKeepStr: '20'))
    timeout(time: 30, unit: 'MINUTES')
  }

  environment {
    DOCKER_IMAGE = 'alishri/shopsphere'   // <-- change to your Docker Hub username
    IMAGE_TAG    = "v${env.BUILD_NUMBER}"
    KUBECONFIG   = '/var/lib/jenkins/.kube/config'
    NAMESPACE    = 'shopsphere'
    APP_HEALTH_URL = 'http://localhost/api/health'   // port 80, through the Kubernetes Ingress
  }

  stages {
    stage('Checkout') {
      when { expression { isDeploy() } }
      steps {
        checkout scm
        sh 'git log -1 --pretty="Commit %h by %an: %s"'
      }
    }

    stage('Test') {
      when { expression { isDeploy() } }
      steps {
        // Runs the Jest API tests inside Docker. If any test fails, the pipeline stops here
        // and nothing is deployed, so the live site keeps running the last good version.
        sh 'docker build --target test -t shopsphere-test:${IMAGE_TAG} .'
      }
    }

    stage('Build Image') {
      when { expression { isDeploy() } }
      steps {
        sh 'docker build --build-arg APP_VERSION=${IMAGE_TAG} -t ${DOCKER_IMAGE}:${IMAGE_TAG} -t ${DOCKER_IMAGE}:latest .'
        sh 'docker images ${DOCKER_IMAGE} --format "{{.Repository}}:{{.Tag}}  {{.Size}}" | head -3'
      }
    }

    stage('Push Image') {
      when { expression { isDeploy() } }
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-creds',
                                          usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
          sh '''
            echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin
            docker push ${DOCKER_IMAGE}:${IMAGE_TAG}
            docker push ${DOCKER_IMAGE}:latest
            docker logout
          '''
        }
      }
    }

    stage('Deploy') {
      when { expression { isDeploy() } }
      steps {
        script { env.DEPLOY_STARTED = 'true' }
        sh '''
          kubectl apply -f k8s/namespace.yaml
          kubectl apply -f k8s/secret.yaml
          kubectl apply -f k8s/mongo.yaml
          sed "s|IMAGE_PLACEHOLDER|${DOCKER_IMAGE}:${IMAGE_TAG}|g" k8s/app.yaml | kubectl apply -f -
          kubectl apply -f k8s/ingress.yaml
          kubectl -n ${NAMESPACE} annotate deployment/shopsphere \
            kubernetes.io/change-cause="Jenkins build #${BUILD_NUMBER} (${IMAGE_TAG})" --overwrite
        '''
      }
    }

    stage('Health Check') {
      when { expression { isDeploy() } }
      steps {
        sh '''
          kubectl -n ${NAMESPACE} rollout status deployment/mongo --timeout=180s
          kubectl -n ${NAMESPACE} rollout status deployment/shopsphere --timeout=180s
          kubectl -n ${NAMESPACE} get pods -o wide

          # The new version must answer on port 80 (the address faculty open) before we call it a success.
          for i in $(seq 1 30); do
            RESP=$(curl -fsS -m 3 ${APP_HEALTH_URL} || true)
            if echo "$RESP" | grep -qw "${IMAGE_TAG}"; then
              echo "Healthy: $RESP"
              exit 0
            fi
            echo "Waiting for ${IMAGE_TAG} to answer (attempt $i)..."
            sleep 3
          done
          echo "Health check failed"
          exit 1
        '''
      }
    }

    stage('Rollback') {
      when { expression { !isDeploy() } }
      steps {
        sh '''
          kubectl -n ${NAMESPACE} rollout undo deployment/shopsphere
          kubectl -n ${NAMESPACE} rollout status deployment/shopsphere --timeout=180s
          kubectl -n ${NAMESPACE} rollout history deployment/shopsphere | tail -4
          sleep 3
          curl -fsS -m 3 ${APP_HEALTH_URL} || true
        '''
      }
    }
  }

  post {
    success {
      script {
        def ip = sh(returnStdout: true, script: 'curl -fs -m 3 https://checkip.amazonaws.com || echo localhost').trim()
        def url = "http://${ip}"
        currentBuild.description = isDeploy() ? "${env.IMAGE_TAG} live at ${url}" : "Rolled back - ${url}"
        echo "ShopSphere is live at ${url}"
      }
    }
    failure {
      script {
        // Only undo if this build actually changed Kubernetes. A failed test never reaches here with DEPLOY_STARTED.
        if (env.DEPLOY_STARTED == 'true') {
          echo 'Deployment failed: rolling back to the previous version'
          sh 'kubectl -n ${NAMESPACE} rollout undo deployment/shopsphere || true'
        }
      }
    }
    always {
      sh 'docker rmi shopsphere-test:${IMAGE_TAG} >/dev/null 2>&1 || true'
      sh 'docker image prune -f >/dev/null 2>&1 || true'
    }
  }
}
