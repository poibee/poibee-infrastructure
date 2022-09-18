// Based on: https://github.com/pulumi/examples/tree/master/gcp-ts-gke-hello-world

import * as gcp from "@pulumi/gcp";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

const name = "poibee";

const config = new pulumi.Config();
export const masterVersion = config.get("masterVersion") ||
    gcp.container.getEngineVersions().then(it => it.latestMasterVersion);

// Create a GCP cluster
const poibeeGcpCluster = new gcp.container.Cluster(name, {
    // We can't create a cluster with no node pool defined, but we want to only use
    // separately managed node pools. So we create the smallest possible default
    // node pool and immediately delete it.
    initialNodeCount: 1,
    removeDefaultNodePool: true,

    minMasterVersion: masterVersion,
});

const poibeeGcpNodePool = new gcp.container.NodePool(`primary-node-pool`, {
    cluster: poibeeGcpCluster.name,
    initialNodeCount: 1,
    location: poibeeGcpCluster.location,
    nodeConfig: {
        preemptible: true,
        machineType: "n1-standard-1",
        oauthScopes: [
            "https://www.googleapis.com/auth/compute",
            "https://www.googleapis.com/auth/devstorage.read_only",
            "https://www.googleapis.com/auth/logging.write",
            "https://www.googleapis.com/auth/monitoring",
        ],
    },
    version: masterVersion,
    management: {
        autoRepair: true,
    },
}, {
    dependsOn: [poibeeGcpCluster],
});

// Export the Cluster name
export const clusterName = poibeeGcpCluster.name;

// Manufacture a GKE-style kubeconfig. Note that this is slightly "different"
// because of the way GKE requires gcloud to be in the picture for cluster
// authentication (rather than using the client cert/key directly).
export const kubeconfig = pulumi.
all([ poibeeGcpCluster.name, poibeeGcpCluster.endpoint, poibeeGcpCluster.masterAuth ]).
apply(([ name, endpoint, masterAuth ]) => {
    const context = `${gcp.config.project}_${gcp.config.zone}_${name}`;
    return `apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: ${masterAuth.clusterCaCertificate}
    server: https://${endpoint}
  name: ${context}
contexts:
- context:
    cluster: ${context}
    user: ${context}
  name: ${context}
current-context: ${context}
kind: Config
preferences: {}
users:
- name: ${context}
  user:
    auth-provider:
      config:
        cmd-args: config config-helper --format=json
        cmd-path: gcloud
        expiry-key: '{.credential.token_expiry}'
        token-key: '{.credential.access_token}'
      name: gcp
`;
});

// Create a Kubernetes provider instance that uses our cluster from above.
const clusterProvider = new k8s.Provider(name, {
    kubeconfig: kubeconfig,
}, {
    dependsOn: [poibeeGcpNodePool],
});

// Create a Kubernetes Namespace
const ns = new k8s.core.v1.Namespace(name, {}, { provider: clusterProvider });

// Export the Namespace name
export const namespaceName = ns.metadata.name;

function createDeploymentWithService(
    appName: string,
    serviceType: string,
    servicePort: number,
    clusterProvider: k8s.Provider,
    namespace: k8s.core.v1.Namespace):
    { deployment: k8s.apps.v1.Deployment; service: k8s.core.v1.Service; } {

    const deploymentName = "poibee-" + appName;
    const imageName = "ghcr.io/poibee/poibee-" + appName + ":main";
    const labelsDeployment = { appClass: deploymentName };

    const deployment = new k8s.apps.v1.Deployment(deploymentName,
        {
            metadata: {
                namespace: namespace.metadata.name,
                labels: labelsDeployment,
            },
            spec: {
                replicas: 1,
                selector: { matchLabels: labelsDeployment },
                template: {
                    metadata: {
                        labels: labelsDeployment,
                    },
                    spec: {
                        containers: [
                            {
                                name: deploymentName,
                                image: imageName,
                                ports: [{ name: "http", containerPort: servicePort }],
                            },
                        ],
                    },
                },
            },
        },
        {
            provider: clusterProvider,
        },
    );

    const service = new k8s.core.v1.Service(deploymentName,
        {
            metadata: {
                labels: labelsDeployment,
                namespace: namespaceName,
                name: deploymentName
            },
            spec: {
                type: serviceType,
                ports: [{ port: servicePort, targetPort: "http" }],
                selector: labelsDeployment,
            },
        },
        {
            provider: clusterProvider,
        },
    );

    return {deployment, service};
}

/**
 * PoiBee-Overpass
 */
const deploymentWithServiceOverpass = createDeploymentWithService("overpass", "ClusterIP", 3000, clusterProvider, ns);
export const deploymentNameOverpass = deploymentWithServiceOverpass.deployment.metadata.name;
export const serviceNameOverpass = deploymentWithServiceOverpass.service.metadata.name;

/**
 * PoiBee-App
 */
const deploymentWithServiceApp = createDeploymentWithService("app", "ClusterIP", 80, clusterProvider, ns);
export const deploymentNameApp = deploymentWithServiceApp.deployment.metadata.name;
export const serviceNameApp = deploymentWithServiceApp.service.metadata.name;

/**
 * PoiBee-Infrastructure
 */
const deploymentWithServiceInfrastructure = createDeploymentWithService("infrastructure", "LoadBalancer", 80, clusterProvider, ns);
export const deploymentNameInfrastructure = deploymentWithServiceInfrastructure.deployment.metadata.name;
export const serviceNameInfrastructure = deploymentWithServiceInfrastructure.service.metadata.name;
export const servicePublicIpInfrastucture = deploymentWithServiceInfrastructure.service.status.loadBalancer.ingress[0].ip;
