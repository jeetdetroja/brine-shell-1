# Brine & Shell

## Project structure

```
brine-shell/
├── frontend/
│   └── public/                 Static site served by the backend
│       ├── assets/
│       │   ├── css/            Stylesheets
│       │   ├── images/         Site images
│       │   └── js/             Browser scripts
│       ├── data/               Shared public product catalog
│       ├── *.html              Site pages
│       ├── robots.txt
│       └── sitemap.xml
└── backend/
    ├── server.js               Application entry point
    ├── package.json
    ├── scripts/                One-off maintenance scripts
    └── src/
        ├── app.js              Express application configuration
        ├── config/             Central application settings
        ├── controllers/        Request and response handlers
        ├── middleware/         Authentication, limits, and errors
        ├── routes/             Endpoint definitions
        ├── services/           External service integrations
        └── utils/              Shared application helpers
```

## Run locally

```bash
cd backend
npm install
npm start
```

The site is then available at `http://localhost:3000`. Product data remains
shared by the browser and API at `frontend/public/data/products.json`.
