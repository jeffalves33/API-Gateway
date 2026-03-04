// Arquivo: middleware/tenantGuard.js
// Objetivo: impedir acesso cross-account mesmo que alguém tente "chutar" id_customer.

const { pool } = require('../config/db');

/**
 * Verifica se um customer pertence à mesma account do usuário logado.
 * Retorna true/false.
 */
async function customerBelongsToAccount(id_customer, id_account) {
  const result = await pool.query(
    `
      SELECT 1
      FROM customer c
      JOIN "user" u ON u.id_user = c.id_user
      WHERE c.id_customer = $1 AND u.id_account = $2
      LIMIT 1
    `,
    [Number(id_customer), Number(id_account)]
  );

  return result.rows.length > 0;
}

/**
 * Middleware: garante que o id_customer (em query/body/params) pertence à mesma account.
 * - Por padrão, procura: req.params.id_customer, req.query.id_customer, req.body.id_customer
 * - Se não encontrar id_customer, não bloqueia (rota pode não usar customer)
 */
function requireCustomerInAccount() {
  return async (req, res, next) => {
    try {
      const id_account = req?.auth?.id_account || req?.user?.id_account;

      // Se ainda não tem contexto de account, é erro de auth (Card 3)
      if (!id_account) {
        return res.status(401).json({ success: false, message: 'Contexto de conta ausente. Faça login novamente.' });
      }

      const id_customer =
        req?.params?.id_customer ||
        req?.query?.id_customer ||
        req?.body?.id_customer;

      // Se rota não usa id_customer, segue normal
      if (!id_customer) return next();

      const ok = await customerBelongsToAccount(id_customer, id_account);
      if (!ok) {
        // 404 é melhor para não “vazar” que o recurso existe
        return res.status(404).json({ success: false, message: 'Recurso não encontrado.' });
      }

      return next();
    } catch (err) {
      console.error('TenantGuard(requireCustomerInAccount) error:', err);
      return res.status(500).json({ success: false, message: 'Erro ao validar acesso ao recurso.' });
    }
  };
}

module.exports = {
  customerBelongsToAccount,
  requireCustomerInAccount
};
