# Setup cnfig file:

export KUBECONFIG=<k8s-config-file>

# Setup Ingress and Letsencrypt resources:

helm install my-ingress ingress-nginx/ingress-nginx -n example-ingress
helm install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace --version v1.10.1 --set installCRDs=true

# Setup PoiBee resources:

kubectl get all -n poibee
kubectl apply -f namespace.yaml
helm -n poibee install poibee-app-chart poibee-app/ --values poibee-app/values.yaml
helm -n poibee install poibee-overpass-chart poibee-overpass/ --values poibee-overpass/values.yaml

# Debugging:

## By wget/curl from everywhere

wget --header 'Host: poibee.de' 'http://185.233.189.217/discover' -O app.html
curl -kivL -H 'Host: poibee.de' 'http://185.233.189.217/discover'
wget 'http://poibee.de/discover' -O app.html

## By Busybox container in same K8S namespace
kubectl run -i --tty busybox --image=busybox:1.28 --namespace poibee --rm -- sh

wget 'http://poibee-app/discover' -O app.html
wget 'http://poibee-overpass:3000/pois/node-1628572605' -O pois.json
