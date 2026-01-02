import { Component, signal } from '@angular/core';

type Voucher = {
  id: string;
  title: string;
  description: string;
  amount: number;
};

type CheckoutResponse = {
  initPoint?: string;
  sandboxInitPoint?: string;
  error?: string;
};

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Sheraton');
  protected readonly vouchers: Voucher[] = [
    {
      id: 'voucher-deluxe',
      title: 'Voucher Deluxe',
      description: 'Estadia para dos con desayuno buffet y late check-out.',
      amount: 35000
    },
    {
      id: 'voucher-spa',
      title: 'Voucher Spa',
      description: 'Circuito de spa y masaje relajante para dos personas.',
      amount: 42000
    },
    {
      id: 'voucher-gourmet',
      title: 'Voucher Gourmet',
      description: 'Cena de tres pasos con maridaje en el restaurante del hotel.',
      amount: 28000
    }
  ];

  protected readonly activeVoucher = signal<Voucher | null>(null);
  protected readonly isCheckoutLoading = signal(false);
  protected readonly checkoutError = signal<string | null>(null);

  protected formatAmount(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(amount);
  }

  protected openVoucher(voucher: Voucher): void {
    this.activeVoucher.set(voucher);
    this.checkoutError.set(null);
  }

  protected closeVoucher(): void {
    this.activeVoucher.set(null);
  }

  protected async openCheckout(voucher: Voucher): Promise<void> {
    this.isCheckoutLoading.set(true);
    this.checkoutError.set(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: voucher.id })
      });

      if (!response.ok) {
        const message = await response.text();
        this.checkoutError.set(message || 'No se pudo iniciar el pago.');
        return;
      }

      const data = (await response.json()) as CheckoutResponse;
      const url = data.initPoint || data.sandboxInitPoint;

      if (!url) {
        this.checkoutError.set('No se recibio la URL de pago.');
        return;
      }

      window.open(url, '_blank', 'noopener');
    } catch (error) {
      console.error(error);
      this.checkoutError.set('Error de conexion con el servidor.');
    } finally {
      this.isCheckoutLoading.set(false);
    }
  }
}
