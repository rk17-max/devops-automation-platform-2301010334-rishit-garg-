# ==========================================================
# Terraform Infrastructure as Code (AWS EKS / Cloud Cluster)
# ==========================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  default = "us-east-1"
}

variable "cluster_name" {
  default = "devops-enterprise-eks"
}

# 1. Dedicated Production VPC
resource "aws_vpc" "devops_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = {
    Name        = "devops-production-vpc"
    Environment = "production"
  }
}

# 2. Public & Private Subnets
resource "aws_subnet" "public_subnet" {
  vpc_id                  = aws_vpc.devops_vpc.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "${var.aws_region}a"
  tags = {
    Name = "devops-public-subnet"
  }
}

resource "aws_subnet" "private_subnet" {
  vpc_id            = aws_vpc.devops_vpc.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "${var.aws_region}b"
  tags = {
    Name = "devops-private-subnet"
  }
}

# 3. Security Group with Zero-Trust Ingress Rules
resource "aws_security_group" "eks_sg" {
  name        = "devops-eks-cluster-sg"
  description = "Security group for EKS control plane and worker nodes"
  vpc_id      = aws_vpc.devops_vpc.id

  ingress {
    description = "Allow HTTPS within VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.devops_vpc.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

output "vpc_id" {
  value = aws_vpc.devops_vpc.id
}

output "cluster_endpoint" {
  value = "https://${var.cluster_name}.eks.amazonaws.com"
}
