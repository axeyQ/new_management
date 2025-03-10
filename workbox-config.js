module.exports = {
    globDirectory: 'public',
    globPatterns: [
      '**/*.{js,css,html,png,jpg,jpeg,svg,ico}'
    ],
    swDest: 'public/sw.js',
    runtimeCaching: [
      {
        // Match any API request
        urlPattern: /\/api\//,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 // 1 hour
          }
        }
      },
      {
        // Cache page navigations
        urlPattern: /\/dashboard/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages-cache',
          expiration: {
            maxEntries: 30,
            maxAgeSeconds: 24 * 60 * 60 // 24 hours
          }
        }
      },
      {
        // Cache static assets
        urlPattern: /\.(?:js|css|png|jpg|jpeg|svg|ico)$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
          }
        }
      }
    ]
  };