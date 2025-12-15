pipeline {
    agent any
    
    stages {
        stage('SCM Checkout') {
            steps {
                retry(3) {
                    git branch: 'main', url: 'https://github.com/JanathGunarathna/t-s-bakery'
                }
            }
        }
        stage('Build Docker Image') {
            steps {
                sh 'docker build -t janath/tns-bakery-pipeline:${BUILD_NUMBER} .'
            }
        }
        stage('Login to Docker Hub') {
            steps {
                withCredentials([string(credentialsId: 'tns-bakery-password', variable: 'tns-bakery-devops')]) {
                    script {  
                        sh "docker login -u janath -p '${tns-bakery-devops}'"
                            }
                }
            }
        }
        stage('Push Image') {
            steps {
                sh "docker push janath/tns-bakery-pipeline:${BUILD_NUMBER}"
            }
        }
    }
    post {
        always {
            sh 'docker logout'
        }
    }
}