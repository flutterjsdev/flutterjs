
### Update regarding PubJS Logic

We will implementing the "CDN" as a GitHub repository structure.
Base URL: `https://raw.githubusercontent.com/flutterjs/packages/main/packages`

Structure:
`$BASE_URL/$packageName/package.json`

The `package.json` for a package (e.g. `http`) will look like:
```json
{
  "name": "http",
  "flutterjs_mapping": "@flutterjs/http",
  "version": "1.0.0" 
}
```

The `RegistryClient` will fetch this JSON.
If the status is 200, it parses the `flutterjs_mapping`.
If 404, it assumes no mapping exists or asks user (for now, we will just warn).
