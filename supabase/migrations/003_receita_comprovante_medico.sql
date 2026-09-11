-- Médico também precisa apresentar receita e comprovante de pagamento pra
-- comprar (mesma exigência que já existia só pra paciente/Indicacao) — o
-- checklist "o que falta pra fechar" agora é igual pra todo mundo em
-- C. Clientes/Contatos. Puramente aditivo, não mexe em dado existente.
ALTER TABLE cadastros ADD COLUMN IF NOT EXISTS receita text;
ALTER TABLE cadastros ADD COLUMN IF NOT EXISTS comprovante_pagamento text;
