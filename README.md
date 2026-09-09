# Media Viewer

Media Viewer is MyWallpaper's general-purpose Canvas add-on for images, video,
audio, and supported embedded media. One `resource` setting accepts either a
published wallpaper resource or a credential-free live URL. MyWallpaper does
not proxy the request, and the browser's normal CSP, CORS, autoplay, and media
rules remain in force.

The editor groups settings into Source, Playback, Display, Effects, and
Advanced. It supports media controls, looping, volume and playback rate,
object fitting, visual filters, rounded corners, and an optional refresh
interval. Remote embeds use privacy-conscious provider URLs where available.
The add-on has no native component.

## Development

Use Node.js 24 and the pnpm version pinned by `packageManager`:

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
```

Run `mywallpaper dev` for the complete in-application preview. The CLI starts a
loopback development server and MyWallpaper Desktop renders the same exported
`mount` entry used by published releases.

## Publishing

Merge the source and matching manifest/package version into the reviewed default
branch, wait for quality checks, then push a new immutable `v<version>` tag.
Open this add-on's management page in MyWallpaper and select that tag to request
publication with an active lifetime entitlement.

MyWallpaper resolves the exact public repository and commit, dispatches its
pinned central workflow, rebuilds and verifies the artifacts, and publishes the
immutable transport from the platform repository. The add-on repository needs
no publication workflow or MyWallpaper credential. Do not pre-create a GitHub
release: a source tag alone does not publish the add-on to the catalogue.

Each accepted newer release is available for new installations. Existing
wallpapers remain pinned to their exact release until explicitly changed.

## License

MIT. See [LICENSE](LICENSE).
