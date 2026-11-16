# Source-specific TLS certificate

`fnmt-ac-componentes-informaticos.pem` is the FNMT-RCM intermediate CA used by
AIReF's `www.airef.es` certificate. AIReF's server currently omits this
intermediate from its TLS handshake. The certificate was verified against the
system trust store before inclusion and is added only to the AIReF feed's Node
refresh process. Hostname checking and normal certificate validation remain
enabled.

SHA-256 fingerprint:

```text
F0:38:42:1F:07:F2:0D:63:A2:0D:36:91:E5:A1:78:AB:84:59:EB:E5:70:C1:64:7B:76:90:55:4E:F2:38:76:AB
```

This intermediate expires on 24 June 2028. Remove it when AIReF serves the
complete certificate chain, or replace it if the official issuer changes. The
domain refresh validator checks the fingerprint and restricts its use to the
AIReF pension feed.
