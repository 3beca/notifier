#!/bin/bash
set -e
echo Deploy image $IMAGE_NAME:$CI_TIMESTAMP
scp -r ./var/www/deploy/charts/** $USER_NAME@$HOST_NAME:./charts/tribeca-notifier/
ssh $USER_NAME@$HOST_NAME helm upgrade tribeca-notifier ./charts/tribeca-notifier \
    --set image=$IMAGE_NAME:$CI_TIMESTAMP \
    --install --wait

