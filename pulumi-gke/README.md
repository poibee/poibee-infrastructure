# Deploy PoiBee by Pulumi to Google Kubernetes Engine (GKE)

The setup is based on the Pulumi-GKE-Typescript example: 
https://github.com/pulumi/examples/tree/master/gcp-ts-gke-hello-world

## Prerequisites

* Install Pulumi
* Install Node.js and cooresponding package manager (npm, Yarn)
* Install Google Cloud SDK (gcloud)
* Configure GCP Auth
    
## Initial project setup

  ```bash
  $ cd pulumi-gke
  $ pulumi new typescript -y
  $ npm add @pulumi/gcp
  $ npm add @pulumi/kubernetes
  ```

## Configure environment

* gcloud init (create new gcloud configuration 'dev' and project 'poibee')
* gcloud auth login
* (link project to billing configuration in GKE-UI)
* gcloud config set project <PROJECT_ID>
* gcloud services enable container.googleapis.com
* gcloud auth application-default login

## Install by pulumi

* npm install
* pulumi stack init
* pulumi config set gcp:project <PROJECT_ID>
* pulumi config set gcp:zone us-west1-a // any valid GCP Zone here
* pulumi update
* (wait some minutes)

Example output:
```bash
$ pulumi update                                  
Previewing update (dev)

View Live: https://app.pulumi.com/poibee/pulumi-gke-poibee/dev/previews/1b2de346-4f90-4246-9da8-d0da6adf9dbd

     Type                              Name                   Plan       
     pulumi:pulumi:Stack               pulumi-gke-poibee-dev             
 +   ├─ gcp:container:Cluster          poibee                 create     
 +   ├─ gcp:container:NodePool         primary-node-pool      create     
 +   ├─ pulumi:providers:kubernetes    poibee                 create     
 +   ├─ kubernetes:core/v1:Namespace   poibee                 create     
 +   ├─ kubernetes:core/v1:Service     poibee                 create     
 +   └─ kubernetes:apps/v1:Deployment  poibee                 create     
 
Outputs:
  + clusterName    : "poibee-bf007df"
  + deploymentName : output<string>
  + kubeconfig     : output<string>
  + masterVersion  : "1.24.3-gke.2100"
  + namespaceName  : output<string>
  + serviceName    : output<string>
  + servicePublicIP: output<string>

Resources:
    + 6 to create
    1 unchanged

Do you want to perform this update? yes
Updating (dev)

View Live: https://app.pulumi.com/poibee/pulumi-gke-poibee/dev/updates/2
     Type                              Name                   Status      Info
     pulumi:pulumi:Stack               pulumi-gke-poibee-dev              2 messages
 +   ├─ gcp:container:Cluster          poibee                 created     
 +   ├─ gcp:container:NodePool         primary-node-pool      created     
 +   ├─ pulumi:providers:kubernetes    poibee                 created     
 +   ├─ kubernetes:core/v1:Namespace   poibee                 created     
 +   ├─ kubernetes:core/v1:Service     poibee                 created     
 +   └─ kubernetes:apps/v1:Deployment  poibee                 created     
 
Outputs:
  + clusterName    : "poibee-1f7a3eb"
  + deploymentName : "poibee-110caaaa"
  + kubeconfig     : [secret]
  + masterVersion  : "1.24.3-gke.2100"
  + namespaceName  : "poibee-59edb494"
  + serviceName    : "poibee-14a916fc"
  + servicePublicIP: "35.230.102.99"

Resources:
    + 6 created
    1 unchanged

Duration: 12m5s
```

=> https://app.pulumi.com/poibee

## Work with `kubectl`

* pulumi stack output kubeconfig --show-secrets > poibee-kubectl.conf
* export KUBECONFIG=poibee-kubectl.conf
* kubectl version
* kubectl get namespaces
* kubectl get all -n poibee-59edb494
* kubectl run -i --tty busybox --image=busybox:1.28 --namespace poibee-9e7f2c64 --rm -- sh

## Tear down environment

* pulumi destroy --yes
* pulumi stack rm --yes


