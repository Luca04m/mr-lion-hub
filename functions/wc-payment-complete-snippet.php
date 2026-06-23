<?php
/**
 * Mr. Lion — Baixa de estoque no Hub a cada pedido PAGO.
 * Instalar como Code Snippet (scope: "Run everywhere") no WooCommerce.
 *
 * Em woocommerce_payment_complete (pagamento confirmado), POSTa o pedido pro
 * endpoint do Hub, que baixa o estoque no Supabase. NÃO controla estoque no WC.
 * Idempotência é garantida no Hub (por pedido × produto) — reenvio não baixa 2x.
 *
 * blocking=false → não atrasa o checkout do cliente (fire-and-forget).
 *
 * ⚠️ Antes de ativar, trocar:
 *   HUB_URL                → URL de produção do Hub (Cloudflare Pages)
 *   WC_WEBHOOK_TOKEN_AQUI  → mesmo valor do secret WC_WEBHOOK_TOKEN no Cloudflare
 */

add_action('woocommerce_payment_complete', 'mrlion_baixa_estoque_hub', 20, 1);
// cobre pedido marcado "processing" sem passar por payment_complete (ex.: admin/manual)
add_action('woocommerce_order_status_processing', 'mrlion_baixa_estoque_hub', 20, 1);

function mrlion_baixa_estoque_hub($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) return;

    $items = array();
    foreach ($order->get_items() as $item) {
        $product = $item->get_product();
        $items[] = array(
            'sku'      => $product ? $product->get_sku() : '',
            'quantity' => $item->get_quantity(),
            'name'     => $item->get_name(),
        );
    }
    if (empty($items)) return;

    wp_remote_post('https://HUB_URL/api/wc-order-paid', array(
        'timeout'  => 8,
        'blocking' => false,
        'headers'  => array(
            'Content-Type' => 'application/json',
            'X-Hub-Token'  => 'WC_WEBHOOK_TOKEN_AQUI',
        ),
        'body' => wp_json_encode(array(
            'id'         => $order->get_id(),
            'status'     => 'paid',
            'line_items' => $items,
        )),
    ));
}
