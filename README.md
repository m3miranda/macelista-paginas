# Páginas Macelista

Publicado pelo GitHub Pages em https://paginas.macelista.com.br (DNS no Cloudflare, CNAME para m3miranda.github.io).
Cada pasta é uma página: `resolve_com_ia_d3/` → https://paginas.macelista.com.br/resolve_com_ia_d3/
A raiz redireciona para macelista.com.br.

Página encerrada: troque o `index.html` da pasta por um redirecionamento (modelo no `index.html` da raiz) ou crie uma regra de redirecionamento no Cloudflare.

## resolve_com_ia_d3 · Protocolo Resolve com IA, evento de 12/12

Página de vendas do evento ao vivo, refeita no estilo Trust & Authority (azul-marinho, botão âmbar, títulos em EB Garamond, corpo em Inter Tight).

- `index.html`: página única, com CSS e JS inline.
- `js/siri-wave.js`: onda de IA do hero (porte em WebGL da página A2, com a paleta nova).
- `assets/`: logo, fotos, prints de depoimentos, fontes e selos de pagamento.

Checkout: só o botão do cartão de oferta (`data-cta="checkout"`) leva à Hotmart e dispara o `InitiateCheckout`. Pixel da Meta, Utmify e Clarity iguais aos da D2.

Pendências antes de publicar: prints reais da D1 na seção de prova, confirmação do "De R$ 97" (hoje aparece "Ingresso de lançamento") e do mapa dos 8 pilares (bloco comentado na seção "O que você leva").
