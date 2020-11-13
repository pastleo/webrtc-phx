module.exports = {
  future: {
    removeDeprecatedGapUtilities: true,
    purgeLayersByDefault: true,
  },
  purge: {
    enabled: true,
    content: ['./js/**/*.js', '../lib/webrtc_phx_web/templates/**/*.eex'],
  },
  theme: {
    extend: {},
  },
  variants: {},
  plugins: [],
}
