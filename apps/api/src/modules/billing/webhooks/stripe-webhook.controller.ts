import { Controller, Post, Req, Res, Headers, HttpCode, HttpStatus, RawBodyRequest } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../../auth/decorators/public.decorator';
import { StripeService } from '../stripe.service';
import Stripe from 'stripe';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(private stripeService: StripeService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    // Obtener raw body (configurado en main.ts con rawBody: true)
    const rawBody = req.rawBody;

    if (!rawBody) {
      return res.status(400).json({ error: 'Missing request body' });
    }

    let event: Stripe.Event;

    try {
      event = this.stripeService.constructWebhookEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return res.status(400).json({ error: `Webhook Error: ${errorMessage}` });
    }

    // Procesar evento de forma asíncrona (no bloquear respuesta)
    this.stripeService.handleWebhookEvent(event).catch((error) => {
      console.error('Error processing webhook event:', error);
    });

    res.json({ received: true });
  }
}

