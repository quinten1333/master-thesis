# Environments for testing multi environment architectures
There are two dev environments which have auto reloading turned on and two production environments using the production builds created by running `./util.sh build all` in the `/blocks` directory.

Below is a template with all environment conriguration pre set:
```yaml
name: <name>
id: <uniqueId>
datasets:
environments:
  dev: # Root level docker-compose.yml
    managementEndpoint: https://thesis.dev.qrcsoftware.nl
    pipelineEndpoint: https://pipeline.thesis.dev.qrcsoftware.nl
    endpoint: amqp://rabbitmq
    default: true
  dev2: # environments/dev-2.yml -> Has auto reloading when root level is active as well.
    managementEndpoint: https://dev2.thesis.dev.qrcsoftware.nl
    pipelineEndpoint: https://pipeline.dev2.thesis.dev.qrcsoftware.nl
    endpoint: amqp://rabbitmq
  a: # environments/a.yml -> Uses production builds (/blocks/util.sh build all)
    managementEndpoint: https://a.thesis.dev.qrcsoftware.nl
    pipelineEndpoint: https://pipeline.a.thesis.dev.qrcsoftware.nl
    endpoint: amqp://rabbitmq
  b: # environments/b.yml -> Uses production builds (/blocks/util.sh build all)
    managementEndpoint: https://b.thesis.dev.qrcsoftware.nl
    pipelineEndpoint: https://pipeline.b.thesis.dev.qrcsoftware.nl
    endpoint: amqp://rabbitmq
userStories:
...
```
