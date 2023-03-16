# quicknexus

quicknexus exposes your localhost to the world for easy testing and sharing! No
need to mess with DNS or deploy just to have others test out your changes.

This repo is the server component. If you are just looking for the CLI
quickportal app, see (https://github.com/BURGERS/quickportal).

## overview

The default quickportal connects to the `localtunnel.me` server. You can,
however, easily set up and run your own server. In order to run your own
quicknexus you must ensure that your server can meet the following requirements:

- You can set up DNS entries for your `domain.tld` and `*.domain.tld` (or
  `tunnel.domain.tld` and `*.tunnel.domain.tld`).
- The server can accept incoming TCP connections for any non-root TCP port (i.e.
  ports over 1000).

The above are important as the client will ask the server for a subdomain under
a particular domain. The server will listen on a random TCP port for client
connections.

#### setup

```shell
# pick a place where the files will live
git clone git://github.com/BURG3R5/quicknexus.git
cd quicknexus
deno task start

# server set to run on port 9995
deno task start --port 9995
```

The quicknexus is now running and waiting for client requests on port 1234.

**NOTE** By default, quicknexus will use subdomains for clients, if you plan to
host your quicknexus itself on a subdomain you will need to use the `--domain`
option and specify the domain name behind which you are hosting quicknexus (e.g.
tunnel.domain.tld)

#### use your server

You can now use your domain with the `--host` flag for the `quickportal`.

```shell
quip 8000 helloworld --host http://tunnel.domain.tld:1333
```

You will be assigned a URL similar to `helloworld.tunnel.domain.tld:1333`.

If your server is acting as a reverse proxy (e.g. nginx) and is able to listen
on port 80, then you do not need the `:1333` part of the hostname for the
`quickportal`.

## REST API

### POST /api/tunnels

Create a new tunnel. A quickportal posts to this endpoint to request a new
tunnel with a specific name, or a randomly assigned name.

### GET /api/status

General server information.

## Deploy

You can deploy your own quicknexus using the prebuilt docker image.

**Note** This assumes that you have a proxy in front of the server to handle the
http(s) requests and forward them to the quicknexus on port 3000.

```
docker run -d \
    --restart always \
    --name quicknexus \
    --net host \
    BURG3R5/quicknexus:latest --port 3000
```
