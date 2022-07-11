const path = require('path')

const ignoreBrokenPlugin = (projectRoot) => {
  return {
    name: 'ignore-missing-broken.js',
    resolveId (source) {
      if (source.endsWith('broken.js')) {
        try {
          return require.resolve('broken.js')
        } catch (e) {
          // just return a stub
          return path.resolve(__dirname, 'mock-broken.js')
        }
      }
    },
  }
}

export default {
  plugins: [
    ignoreBrokenPlugin()
  ]
}
