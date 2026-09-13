import { FastifyRequest, FastifyReply } from 'fastify';
import { melhorEnvioService, CalculateShippingInput } from '../services/melhorenvio.service.js';

export class ShippingController {
  async calculate(request: FastifyRequest<{ Body: CalculateShippingInput }>, reply: FastifyReply) {
    try {
      const { from_postal_code, to_postal_code, products, default_dimensions } = request.body || {};
      
      if (!to_postal_code) {
        return reply.status(400).send({
          success: false,
          error: 'CEP de destino (to_postal_code) é obrigatório'
        });
      }

      const result = await melhorEnvioService.calculateShipping({
        from_postal_code,
        to_postal_code,
        products,
        default_dimensions
      });

      return reply.send(result);
    } catch (err: any) {
      request.log.error('Erro ao calcular frete:', err);
      return reply.status(400).send({
        success: false,
        error: err.message || 'Falha ao calcular frete com Melhor Envio'
      });
    }
  }

  async getConfig(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const config = melhorEnvioService.getShippingConfig();
      return reply.send({
        success: true,
        config
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message
      });
    }
  }
}

export const shippingController = new ShippingController();
