# Wachat

The chat application use The Waku Network.

## Why

- a PoC to battle test The Waku Network.
- create user acceptable with REST API / WebSocket
- facilitate the developer adoption of Waku protocols
- split concern to harden the protocol stabliity with C/S model


*Notes:* This project is still in the early stage of development, and the data is not persistent, use it at your own risk.*

## Features

### Community chat

Basic flow: 
- alice create a community by generate a chat keypair, content topic is the hash of the public key
- alice share the private key with bob
- bob derive the content topic from private key and subscribe to the topic as a member of the community
- alice encrypt the message with the public key and send to the topic
- bob get the message and decrypt with the private key

Admin flow:
- alice create a community by generate an admin keypair, content topic is the hash of the public chat key
- alice send specific messages to the topic, bob don't have the key, so he can't send it.
- todo...

## Development

```shell
npm install

npm run dev
```
