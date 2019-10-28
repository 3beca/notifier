#!/bin/bash
set -e
echo Deploy image $IMAGE_NAME:$CI_TIMESTAMP
ssh -v tribeca@tribeca.ovh /snap/bin/microk8s.kubectl set image deployment/tribeca-notifier tribeca-notifier=$IMAGE_NAME:$CI_TIMESTAMP
ssh -v tribeca@tribeca.ovh /snap/bin/microk8s.kubectl rollout status deployment.v1.apps/tribeca-notifier

