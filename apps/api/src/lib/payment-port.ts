// Payments are mocked behind this interface. Real Stripe Connect slots in
// later by implementing PaymentPort without touching domain logic — no real
// payment provider in v1 (BUILD_SPEC section 5 / section 12).

export interface DepositParams {
  contractId: string;
  amount: number;
}

export interface PayoutParams {
  contractId: string;
  milestoneId: string;
  amount: number;
}

export interface PaymentResult {
  success: true;
  reference: string;
}

export interface PaymentPort {
  deposit(params: DepositParams): Promise<PaymentResult>;
  payout(params: PayoutParams): Promise<PaymentResult>;
}

export class MockPaymentAdapter implements PaymentPort {
  async deposit(params: DepositParams): Promise<PaymentResult> {
    return { success: true, reference: `mock_deposit_${params.contractId}_${Date.now()}` };
  }

  async payout(params: PayoutParams): Promise<PaymentResult> {
    return { success: true, reference: `mock_payout_${params.milestoneId}_${Date.now()}` };
  }
}
