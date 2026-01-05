pipeline {
    agent any
    
    environment {
        DOCKER_HUB_CREDENTIALS = credentials('docker-hub-credentials')
        DOCKER_HUB_REPO = 'karthikragk04'
    }
    
    stages {
        stage('Checkout') {
            steps {
                git branch: 'master', url: 'https://github.com/Karthik251204/EventHub-Event-Management.git'
            }
        }
        
        stage('Build Frontend Image') {
            steps {
                dir('frontend') {
                    script {
                        sh 'docker build -t ${DOCKER_HUB_REPO}/frontend:latest .'
                    }
                }
            }
        }
        
        stage('Build Backend Image') {
            steps {
                dir('backend') {
                    script {
                        retry(3) {
                            sh 'docker build -t ${DOCKER_HUB_REPO}/backend:latest .'
                        }
                    }
                }
            }
        }
        
        stage('Push to Docker Hub') {
            steps {
                script {
                    sh 'echo $DOCKER_HUB_CREDENTIALS_PSW | docker login -u $DOCKER_HUB_CREDENTIALS_USR --password-stdin'
                    sh 'docker push ${DOCKER_HUB_REPO}/frontend:latest'
                    sh 'docker push ${DOCKER_HUB_REPO}/backend:latest'
                }
            }
        }
        
        stage('Deploy') {
            steps {
                script {
                    // Stop and remove existing containers
                    sh 'docker stop frontend backend || true'
                    sh 'docker rm frontend backend || true'
                    
                    // Pull latest images
                    sh 'docker pull ${DOCKER_HUB_REPO}/frontend:latest'
                    sh 'docker pull ${DOCKER_HUB_REPO}/backend:latest'
                    
                    // Run containers
                    sh 'docker run -d --name backend -p 3000:3000 ${DOCKER_HUB_REPO}/backend:latest'
                    sh 'docker run -d --name frontend -p 80:80 ${DOCKER_HUB_REPO}/frontend:latest'
                }
            }
        }
    }
    
    post {
        always {
            sh 'docker logout'
        }
    }
}