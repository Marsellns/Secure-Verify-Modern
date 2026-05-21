pipeline {
    agent any

    environment {
        APP_NAME = "secure-verify-modern"
        PORT = "8081" // Changed to 8081 to avoid conflict with Grafana on port 3000
        HOST_IP = "10.0.2.15" 
    }

    stages {

        stage('Check File') {
            steps {
                sh 'ls -la'
            }
        }

        stage('Install Dependency') {
            steps {
                sh 'npm install'
            }
        }
        
        stage('SAST - SonarQube') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    // Mengambil token dari Credentials
                    withCredentials([string(credentialsId: 'sonarqube-token', variable: 'SONAR_TOKEN')]) {
                        // Perhatikan pengecualian folder public dan penulisan \$SONAR_TOKEN
                        sh """
                        npx sonar-scanner \
                        -Dsonar.projectKey=${APP_NAME} \
                        -Dsonar.sources=. \
                        -Dsonar.exclusions=node_modules/**,public/**,dist/**,build/**,**/*.env \
                        -Dsonar.host.url=http://${HOST_IP}:9000 \
                        -Dsonar.login=\\$SONAR_TOKEN
                        """
                    }
                }
            }
        }
        
        stage('SAST - Security Scan') {
            steps {
                sh 'npm audit || true'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t $APP_NAME .'
            }
        }

        stage('Deploy Container') {
            steps {
                sh '''
                docker stop $APP_NAME || true
                docker rm $APP_NAME || true
                docker run -d -p $PORT:3000 --name $APP_NAME $APP_NAME
                '''
            }
        }

        stage('DAST - Dynamic Test') {
            steps {
                sh """
                docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
                -t http://${HOST_IP}:$PORT || true
                """
            }
        }

        stage('Load Testing') {
            steps {
                sh 'ab -n 200 -c 10 http://${HOST_IP}:$PORT/ || true'
            }
        }

        stage('Monitoring') {
            steps {
                sh 'docker ps'
                sh 'docker stats --no-stream'
            }
        }

    }

    post {
        always {
            echo 'Pipeline selesai (success / fail tetap jalan)'
        }
        success {
            echo 'SUCCESS: Semua tahap berhasil'
        }
        failure {
            echo 'FAILED: Cek console output'
        }
    }
}
