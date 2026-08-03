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

Publishing is performed only by MyWallpaper's immutable OIDC admission
workflow. A version tag is created only after the pull request is merged and
all quality checks are green. Promotion and recommendation remain separate
owner actions after ingestion and desktop validation.

## License

MIT. See [LICENSE](LICENSE).
