import 'dotenv/config';
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.json());

const vouchers = new Map<string, { title: string; description: string; amount: number }>([
  [
    'voucher-deluxe',
    {
      title: 'Voucher Deluxe',
      description: 'Estadia para dos con desayuno buffet y late check-out.',
      amount: 35000
    }
  ],
  [
    'voucher-spa',
    {
      title: 'Voucher Spa',
      description: 'Circuito de spa y masaje relajante para dos personas.',
      amount: 42000
    }
  ],
  [
    'voucher-gourmet',
    {
      title: 'Voucher Gourmet',
      description: 'Cena de tres pasos con maridaje en el restaurante del hotel.',
      amount: 28000
    }
  ]
]);

app.post('/api/checkout', async (req, res) => {
  const accessToken = process.env['MP_ACCESS_TOKEN'];
  if (!accessToken) {
    res.status(500).send('Falta MP_ACCESS_TOKEN en el servidor.');
    return;
  }

  const id = String(req.body?.id ?? '');
  const voucher = vouchers.get(id);
  if (!voucher) {
    res.status(400).send('Voucher invalido.');
    return;
  }

  const preference = {
    items: [
      {
        id,
        title: voucher.title,
        description: voucher.description,
        quantity: 1,
        unit_price: voucher.amount,
        currency_id: 'ARS'
      }
    ],
    back_urls: {
      success: 'http://localhost:4000/checkout/success',
      pending: 'http://localhost:4000/checkout/pending',
      failure: 'http://localhost:4000/checkout/failure'
    }
  };

  try {
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(preference)
    });

    if (!response.ok) {
      const text = await response.text();
      res.status(502).send(text || 'No se pudo crear la preferencia.');
      return;
    }

    const data = (await response.json()) as {
      init_point?: string;
      sandbox_init_point?: string;
    };

    res.json({
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point
    });
  } catch (error) {
    console.error(error);
    res.status(502).send('Error de conexion con Mercado Pago.');
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
