-- SQL Script: Sistema de Rifas Profissional Completo
-- Compatible Dialect: MySQL 5.7+ / 8.0+

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Table: Usuario (Admin Panel logins)
DROP TABLE IF EXISTS `Usuario`;
CREATE TABLE `Usuario` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `senha` VARCHAR(191) NOT NULL,
  `nome` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table: Rifa (Active and Finished draws)
DROP TABLE IF EXISTS `Rifa`;
CREATE TABLE `Rifa` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `titulo` VARCHAR(191) NOT NULL,
  `descricao` TEXT NOT NULL,
  `regulamento` TEXT NOT NULL,
  `valorPorNumero` DOUBLE NOT NULL,
  `quantidadeTotal` INT NOT NULL,
  `dataSorteio` DATETIME(3) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'ATIVO', -- ATIVO, ENCERRADO, FINALIZADO
  `metodoSorteio` VARCHAR(191) NOT NULL DEFAULT 'AVULSO', -- AUTOMATICO, LOTERIA_FEDERAL, MANUAL
  `resultado` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table: ImagemRifa
DROP TABLE IF EXISTS `ImagemRifa`;
CREATE TABLE `ImagemRifa` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `rifaId` INT NOT NULL,
  `url` TEXT NOT NULL,
  `isPrincipal` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT `fk_imagem_rifa` FOREIGN KEY (`rifaId`) REFERENCES `Rifa`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table: Combo (Promo packages configurations)
DROP TABLE IF EXISTS `Combo`;
CREATE TABLE `Combo` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `rifaId` INT NOT NULL,
  `nome` VARCHAR(191) NOT NULL,
  `quantidade` INT NOT NULL,
  `desconto` DOUBLE NOT NULL,
  `valorFinal` DOUBLE NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT `fk_combo_rifa` FOREIGN KEY (`rifaId`) REFERENCES `Rifa`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table: Comprador (Unifed customer register)
DROP TABLE IF EXISTS `Comprador`;
CREATE TABLE `Comprador` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(191) NOT NULL,
  `telefone` VARCHAR(191) NOT NULL UNIQUE,
  `cidade` VARCHAR(191) NOT NULL,
  `estado` VARCHAR(2) NOT NULL,
  `cpf` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Table: Pedido (Invoicing status tracker)
DROP TABLE IF EXISTS `Pedido`;
CREATE TABLE `Pedido` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `hash` VARCHAR(191) NOT NULL UNIQUE,
  `compradorId` INT NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDENTE', -- PENDENTE, PAGO, CANCELADO
  `valorTotal` DOUBLE NOT NULL,
  `pixQrCode` TEXT NULL,
  `pixCopiaCola` TEXT NULL,
  `pixTxid` VARCHAR(191) NULL,
  `gatewayMeta` TEXT NULL,
  `expiracaoPix` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT `fk_pedido_comprador` FOREIGN KEY (`compradorId`) REFERENCES `Comprador`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Table: ItemPedido (Allocated tickets per order)
DROP TABLE IF EXISTS `ItemPedido`;
CREATE TABLE `ItemPedido` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `pedidoId` INT NOT NULL,
  `rifaId` INT NOT NULL,
  `numeros` TEXT NOT NULL, -- Serialized string: e.g. "001,002,003"
  `quantidade` INT NOT NULL,
  `valorUnitario` DOUBLE NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT `fk_item_pedido` FOREIGN KEY (`pedidoId`) REFERENCES `Pedido`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_item_rifa` FOREIGN KEY (`rifaId`) REFERENCES `Rifa`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Table: Ganhador (Audit winners record)
DROP TABLE IF EXISTS `Ganhador`;
CREATE TABLE `Ganhador` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `rifaId` INT NOT NULL,
  `nome` VARCHAR(191) NOT NULL,
  `cidade` VARCHAR(191) NOT NULL,
  `estado` VARCHAR(2) NOT NULL,
  `numeroPremiado` VARCHAR(191) NOT NULL,
  `dataSorteio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `fotoPremioUrl` VARCHAR(191) NULL,
  `fotoEntregaUrl` VARCHAR(191) NULL,
  `depoimento` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT `fk_ganhador_rifa` FOREIGN KEY (`rifaId`) REFERENCES `Rifa`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Table: Configuracao (Key-Value general branding variables)
DROP TABLE IF EXISTS `Configuracao`;
CREATE TABLE `Configuracao` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `chave` VARCHAR(191) NOT NULL UNIQUE,
  `valor` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Database indices for high performance lookup
CREATE INDEX `idx_pedido_status` ON `Pedido` (`status`);
CREATE INDEX `idx_pedido_hash` ON `Pedido` (`hash`);
CREATE INDEX `idx_comprador_telefone` ON `Comprador` (`telefone`);

SET FOREIGN_KEY_CHECKS = 1;

-- =======================================================
-- INITIAL SEED RECORDS (ADMIN & ESSENTIAL BRANDING CONFIGS)
-- =======================================================

-- Admin user seed. Default password: admin123 (Blowfish hashed)
INSERT INTO `Usuario` (`id`, `email`, `senha`, `nome`) 
VALUES (1, 'admin@rifas.com.br', '$2a$10$tZre/9S33u8m.wpxV7T4reK2T9G13b7CfF9b46-bc4e-7b7cf1612e', 'Administrador Geral')
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

-- Site configuration sementes
INSERT INTO `Configuracao` (`chave`, `valor`) VALUES
('site_name', 'Clube da Sorte'),
('logo', ''),
('banner', 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=1200&q=80'),
('whatsapp', '5511999999999'),
('instagram', 'rifas_brasil'),
('facebook', ''),
('telegram', ''),
('tempo_reserva', '15'),
('cor_principal', '#4f46e5'),
('cor_secundaria', '#10b981'),
('gateway_ativo', 'MOCK')
ON DUPLICATE KEY UPDATE `valor` = VALUES(`valor`);
