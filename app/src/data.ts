export interface PlaceInfo {
  imgs: string[];
  onde: string;
  preco: string;
  curiosidade: string;
  gradient: string;
  link?: string;
  linkPagamento?: string;
}

export interface DayData {
  num: string;
  weekday: string;
  date: string;
  title: string;
  sub: string;
  places: string[];
}

export interface CostRow {
  label: string;
  value: string;
  isTotal?: boolean;
}

export const PLACES: Record<string, PlaceInfo> = {
  "Copacabana Blue Hotel": {
    imgs: ["/imgs/hotel/copa-hotel.avif"],
    onde: "Travessa Angrense, 25 – Copacabana",
    preco: "A partir de R$ 360/noite",
    curiosidade: "A apenas 2 quadras da praia mais famosa do mundo, o Copacabana Blue fica na Travessa Angrense — uma ruazinha charmosa onde o movimento da orla dá lugar a uma atmosfera mais tranquila. O hotel é perfeito como base de operações para explorar a Zona Sul: de lá você chega a pé até o calçadão de Copacabana, ao Forte do Leme e ao Posto 6. Uma dica: peça um quarto com vista para os telhados — ao amanhecer, com o sol nascendo sobre o mar, a vista é inesquecível.",
    gradient: "linear-gradient(135deg,#1a3a6e,#0a1628)",
    link: "https://www.google.com/maps/search/?api=1&query=Copacabana+Blue+Hotel+Rio+de+Janeiro",
    linkPagamento: "https://www.booking.com/hotel/br/copacabana-blue.html",
  },
  "Pizzaria Oggi": {
    imgs: [
      "/imgs/pizzaria-oggi/pizzaria-1.jpg",
      "/imgs/pizzaria-oggi/pizzaria-2.jpeg",
      "/imgs/pizzaria-oggi/pizzaria-3.jpeg",
    ],
    onde: "R. Aristides Espinola, 101 – Leblon",
    preco: "Média R$ 60–90/pessoa",
    curiosidade: "A Oggi é considerada por muitos a melhor pizzaria napolitana do Rio de Janeiro — e não é à toa. A massa é fermentada por 48 horas com fermento natural, o que cria aquela leveza característica e as bolhas perfeitas nas bordas. O forno a lenha chega a 450°C e assa cada pizza em menos de 90 segundos. O ambiente é quente, animado e cheio de gente bonita do Leblon. Cheguem antes das 20h para garantir mesa sem fila — depois disso, pode esperar até uma hora.",
    gradient: "linear-gradient(135deg,#5a1a00,#2a0a00)",
    link: "https://www.google.com/maps/search/?api=1&query=Pizzaria+Oggi+Leblon+Rio+de+Janeiro",
  },
  "Caminhada em Copacabana": {
    imgs: [
      "/imgs/copacabana/copacabana-1.jpg",
      "/imgs/copacabana/copacabana-2.jpg",
    ],
    onde: "Orla de Copacabana – Copacabana",
    preco: "Gratuito",
    curiosidade: "O calçadão de Copacabana tem 4 km de extensão e é uma das obras mais famosas do paisagista Roberto Burle Marx — o mosaico ondulado de pedra portuguesa preta e branca foi criado nos anos 70 e virou símbolo da cidade. De manhã cedo, quando o sol ainda não esquentou, a orla vira academia ao ar livre: corredores, ciclistas, vendedores de mate e coqueiros num espetáculo só carioca. Vão até o Posto 6, o menos badalado e o mais tranquilo — é onde os moradores do bairro realmente curtem o mar.",
    gradient: "linear-gradient(135deg,#006080,#001520)",
    link: "https://www.google.com/maps/search/?api=1&query=Orla+de+Copacabana+Rio+de+Janeiro",
  },
  "Mureta da Urca": {
    imgs: [
      "/imgs/mureta-urca/mureta-1.jpg",
      "/imgs/mureta-urca/mureta-2.jpg",
      "/imgs/mureta-urca/mureta-3.jpg",
    ],
    onde: "Av. João Luís Alves, 376 – Urca",
    preco: "Gratuito (bebidas à parte)",
    curiosidade: "Chamada de 'o maior balcão de bar do mundo', a Mureta da Urca é uma parede de pedra à beira-mar com vista direta para o Pão de Açúcar. No fim da tarde, dezenas de pessoas se sentam nas pedras, compram cerveja gelada dos ambulantes e ficam assistindo o sol se pôr por trás da montanha — é um dos rituais mais bonitos e democráticos do Rio. O bairro da Urca, por sinal, é um dos mais tranquilos e preservados da cidade, com casinhas coloridas e uma atmosfera de interior europeu que surpreende quem visita pela primeira vez.",
    gradient: "linear-gradient(135deg,#1a4a1a,#061306)",
    link: "https://www.google.com/maps/search/?api=1&query=Mureta+da+Urca+Rio+de+Janeiro",
  },
  "Parque Lage": {
    imgs: [
      "/imgs/parque-lage/parque-lage-1.jpeg",
      "/imgs/parque-lage/parque-lage-3.jpeg",
    ],
    onde: "R. Jardim Botânico, 414 – Jardim Botânico",
    preco: "Gratuito",
    curiosidade: "O Parque Lage é uma das jóias escondidas do Rio — um parque na base da floresta da Tijuca com um casarão neoclássico do século XIX no centro. Esse casarão já foi cenário de dezenas de filmes, clipes e novelas brasileiras. Dentro dele funciona a Escola de Artes Visuais, mas o café no pátio interno é aberto ao público e é um dos pontos mais instagramáveis da cidade, com a trilha para o Cristo ao fundo. A entrada é gratuita e o parque tem piscina, lagos com carpa e trilhas que sobem direto para a Floresta da Tijuca.",
    gradient: "linear-gradient(135deg,#0a3a0a,#020d02)",
    link: "https://www.google.com/maps/search/?api=1&query=Parque+Lage+Rio+de+Janeiro",
  },
  "Jardim Botânico": {
    imgs: [
      "/imgs/jardim-botanico/jardim-botanico-1.jpeg",
      "/imgs/jardim-botanico/jardim-botanico-2.jpeg",
      "/imgs/jardim-botanico/jardim-botanico-3.jpg",
    ],
    onde: "R. Jardim Botânico, 1008 – Jardim Botânico",
    preco: "R$ 40 (inteira)",
    curiosidade: "Fundado em 1808 por Dom João VI para aclimatar especiarias trazidas das colônias portuguesas, o Jardim Botânico do Rio tem mais de 6.500 espécies de plantas espalhadas por 137 hectares. O famoso Jardim dos Beija-Flores reúne dezenas de espécies de flores projetadas para atrair beija-flores — e eles aparecem. Outro destaque é a Alameda das Palmeiras Imperiais, com árvores de mais de 30 metros plantadas em 1842. Vão de manhã: o jardim é fresco e tranquilo antes do calor do meio-dia, e os animais (preguiças, tucanos, jacus) aparecem com mais frequência.",
    gradient: "linear-gradient(135deg,#1a4a00,#062000)",
    link: "https://www.google.com/maps/search/?api=1&query=Jardim+Botanico+Rio+de+Janeiro",
    linkPagamento: "https://ingressos.jbrj.gov.br/",
  },
  "Ipanema e Leblon": {
    imgs: [],
    onde: "Orla de Ipanema – Zona Sul",
    preco: "Gratuito",
    curiosidade: "Ipanema é a praia mais famosa do Rio depois de Copacabana, imortalizada pela bossa nova 'Garota de Ipanema' composta por Tom Jobim e Vinícius de Moraes em 1962 — a música se tornou a segunda mais tocada do mundo, perdendo só para 'Yesterday' dos Beatles. Cada posto tem sua tribo: o Posto 8 é o mais familiar, o Posto 9 é o point da galera jovem e dos surfistas, e a divisa com o Leblon (na Pedra do Arpoador) é onde todo mundo converge para o pôr do sol. Não percam o kiosque do Açaí da Leila logo na saída do Posto 9.",
    gradient: "linear-gradient(135deg,#003a6e,#000d1a)",
    link: "https://www.google.com/maps/search/?api=1&query=Praia+de+Ipanema+Rio+de+Janeiro",
  },
  "Pôr do sol no Arpoador": {
    imgs: [
      "/imgs/arpoador/arpoador-1.jpg",
      "/imgs/arpoador/arpoador-2.webp",
      "/imgs/arpoador/arpoador-3.jpg",
      "/imgs/arpoador/arpoador-4.jpeg",
      "/imgs/arpoador/arpoador-5.jpeg",
    ],
    onde: "Pedra do Arpoador – Ipanema",
    preco: "Gratuito",
    curiosidade: "A Pedra do Arpoador é uma rocha que avança sobre o mar na ponta entre Ipanema e Copacabana — e é lá que acontece um dos rituais mais bonitos do Rio. Todo dia, quando o sol se aproxima do horizonte sobre o mar, dezenas (às vezes centenas) de pessoas escalam a pedra, abrem as cervejas e assistem ao pôr do sol em silêncio respeitoso. Quando o sol some, todo mundo aplaude. Em fevereiro, o sol se põe por volta das 19h15 com o céu cor de laranja e rosa. Não percam isso por nada — cheguem com 30 minutos de antecedência para pegar um bom lugar na pedra.",
    gradient: "linear-gradient(135deg,#5a2a00,#1a0500)",
    link: "https://www.google.com/maps/search/?api=1&query=Pedra+do+Arpoador+Rio+de+Janeiro",
  },
  "Baixo Botafogo": {
    imgs: ["/imgs/botafogo/botafogo-1.jpeg"],
    onde: "Rua Voluntários da Pátria – Botafogo",
    preco: "Média R$ 40–80/pessoa",
    curiosidade: "O 'Baixo Bota' é o bairro que reinventou a noite carioca nos anos 2010. Enquanto Lapa era a capital do samba e da zona boêmia tradicional, Botafogo criou uma cena própria com bares autorais, cervejas artesanais e um público mais eclético. A Rua Voluntários da Pátria é o epicentro: bares lado a lado com mesinhas na calçada, petiscos criativos e DJs que tocam de jazz a funk. A vista para o Pão de Açúcar aparece de vários pontos do bairro — inclusive de dentro de alguns bares que ficam nos andares de cima dos sobrados.",
    gradient: "linear-gradient(135deg,#2a006e,#0a0020)",
    link: "https://www.google.com/maps/search/?api=1&query=Baixo+Botafogo+Rio+de+Janeiro",
  },
  "SAARA": {
    imgs: [
      "/imgs/saara/saara-1.jpeg",
      "/imgs/saara/saara-2.jpg",
      "/imgs/saara/saara-3.jpeg",
    ],
    onde: "Rua da Alfândega – Centro",
    preco: "Gratuito (compras à parte)",
    curiosidade: "O SAARA (Sociedade de Amigos das Adjacências da Rua da Alfândega) é o maior shopping a céu aberto da América Latina, com mais de 1.200 lojas espalhadas por 10 ruas do Centro do Rio. O nome veio dos próprios comerciantes, que em sua maioria eram imigrantes árabes, judeus e sírios vindos para o Brasil no início do século XX — e que batizaram o lugar em homenagem ao deserto do Saara. Aqui você encontra fantasias de Carnaval, roupas, tecidos, bijuterias, temperos e souvenirs por preços que não têm comparação em nenhum shopping. É barulhento, animado e completamente caótico — no melhor sentido.",
    gradient: "linear-gradient(135deg,#5a3a00,#1a0e00)",
    link: "https://www.google.com/maps/search/?api=1&query=SAARA+Rua+da+Alfandega+Rio+de+Janeiro",
  },
  "Escadaria Selarón": {
    imgs: [
      "/imgs/escadaria/escadaria-1.jpeg",
      "/imgs/escadaria/escadaria-2.jpeg",
      "/imgs/escadaria/escadaria-3.jpeg",
    ],
    onde: "R. Manuel Carneiro – Santa Teresa",
    preco: "Gratuito",
    curiosidade: "A Escadaria Selarón é uma das obras de arte mais únicas do mundo — 215 degraus cobertos por mais de 2.000 azulejos coloridos vindos de mais de 60 países. Tudo foi criado pelo artista chileno Jorge Selarón, que em 1990 resolveu 'de presente ao povo brasileiro e ao povo carioca' reformar a escadaria degradada que ficava na frente da sua casa em Santa Teresa. Ele passou mais de 20 anos coletando azulejos de viajantes do mundo todo, nunca parou de trabalhar — e foi encontrado morto na própria escadaria em 2013, em circunstâncias nunca totalmente esclarecidas. A escadaria é o seu testamento.",
    gradient: "linear-gradient(135deg,#5a0000,#1a0000)",
    link: "https://www.google.com/maps/search/?api=1&query=Escadaria+Selaron+Santa+Teresa+Rio+de+Janeiro",
  },
  "Arcos da Lapa": {
    imgs: [],
    onde: "Rua Mem de Sá – Lapa",
    preco: "Gratuito",
    curiosidade: "Os Arcos da Lapa foram construídos entre 1723 e 1750 para trazer água do Rio Carioca até o Centro — funcionavam como um aqueduto que percorria 1,3 km com 42 arcos de pedra. Pararam de funcionar como aqueduto em 1896, quando a cidade modernizou seu sistema de abastecimento, e desde então sustentam o famoso Bonde de Santa Teresa. À noite, os Arcos viram o pano de fundo da Lapa boêmia: os bares espalham mesas pela rua, os grupos de samba tocam nas calçadas e o ritmo carioca toma conta de tudo até o amanhecer.",
    gradient: "linear-gradient(135deg,#3a3a00,#0e0e00)",
    link: "https://www.google.com/maps/search/?api=1&query=Arcos+da+Lapa+Rio+de+Janeiro",
  },
  "Museu do Amanhã": {
    imgs: [
      "/imgs/museu-amanha/museu-amanha-1.webp",
      "/imgs/museu-amanha/museu-amanha-2.jpg",
      "/imgs/museu-amanha/museu-amanha-3.jpeg",
    ],
    onde: "Praça Mauá, 1 – Centro",
    preco: "R$ 40 (inteira)",
    curiosidade: "Inaugurado em 2015 na revitalizada Praça Mauá, o Museu do Amanhã foi projetado pelo arquiteto espanhol Santiago Calatrava — o mesmo que criou o Estádio Olímpico de Atenas e a Cidade das Artes e das Ciências em Valência. O prédio, que parece uma nave espacial pousada sobre o Pier Mauá, é sustentável: os painéis solares suprem parte da energia e o sistema de resfriamento usa água da Baía de Guanabara. Por dentro, o museu conta a história da Terra e projeta cenários para os próximos 50 anos — com instalações interativas que fazem você pensar no que o ser humano está fazendo com o planeta.",
    gradient: "linear-gradient(135deg,#003a5a,#000f1a)",
    link: "https://www.google.com/maps/search/?api=1&query=Museu+do+Amanha+Rio+de+Janeiro",
    linkPagamento: "https://museudoamanha.org.br/pt-br/ingressos",
  },
  "AquaRio": {
    imgs: [
      "/imgs/aquario/aquario-1.jpg",
      "/imgs/aquario/aquario-2.jpeg",
      "/imgs/aquario/aquario-3.jpeg",
    ],
    onde: "Av. Rodrigues Alves – Porto Maravilha",
    preco: "R$ 160 (inteira)",
    curiosidade: "O AquaRio é o maior aquário marinho da América do Sul, com 4,5 milhões de litros de água salgada e mais de 8.000 animais de 350 espécies diferentes. O tanque central — chamado de 'Oceano' — tem 3,5 milhões de litros e um túnel de acrílico onde tubarões, arraias e tartarugas nadam sobre a sua cabeça. O aquário fica no Porto Maravilha, a área revitalizada do centro portuário do Rio, pertinho do Museu do Amanhã. Vale comprar ingresso online com antecedência — nos fins de semana e feriados pode lotar. Uma das experiências mais surpreendentes para quem vem pela primeira vez.",
    gradient: "linear-gradient(135deg,#003060,#000818)",
    link: "https://www.google.com/maps/search/?api=1&query=AquaRio+Rio+de+Janeiro",
    linkPagamento: "https://www.aquariodorio.com.br/ingressos/",
  },
  "Bosque Bar": {
    imgs: [
      "/imgs/bosque-bar/bosque-bar-1.jpg",
      "/imgs/bosque-bar/bosque-bar-2.jpg",
      "/imgs/bosque-bar/bosque-bar-3.avif",
    ],
    onde: "Av. Bartolomeu Mitre, 1314 – Gávea",
    preco: "Média R$ 60–100/pessoa",
    curiosidade: "O Bosque Bar fica dentro do Jockey Club Brasileiro, na Gávea — e isso já diz tudo. O ambiente mistura natureza, história e festa de um jeito que só o Rio consegue. As árvores centenárias do Jockey formam um teto verde natural sobre o bar, que funciona até de madrugada com DJs e bandas ao vivo. No fim de semana, o bar vira balada e as filas podem ser grandes — mas o clima vale a espera. Fica num dos pontos mais chiques da Zona Sul, entre a PUC e o Jardim Botânico. Cheguem antes das 22h para garantir mesa.",
    gradient: "linear-gradient(135deg,#1a3a00,#060e00)",
    link: "https://www.google.com/maps/search/?api=1&query=Bosque+Bar+Jockey+Club+Rio+de+Janeiro",
  },
  "Stand Up Paddle": {
    imgs: [
      "/imgs/standup/standup-1.jpeg",
      "/imgs/standup/standup-2.jpeg",
      "/imgs/standup/standup-3.jpeg",
    ],
    onde: "Praia de Copacabana – Posto 6",
    preco: "A partir de R$ 50/hora",
    curiosidade: "Pegar o mar ao amanhecer em Copacabana de stand up paddle é uma das experiências mais únicas e inesperadas do Rio. Quando você está em pé na prancha, olhando para o horizonte com o Pão de Açúcar à sua direita e o Forte do Leme atrás, a cidade toda se revela de um ângulo que nenhuma foto consegue capturar. O mar de fevereiro é quente (em torno de 26°C) e geralmente calmo de manhã — perfeito para iniciantes. Você não precisa ter experiência: os instrutores ensinam em minutos. Uma dica: vão antes das 8h, quando o mar ainda está flat e o sol não está forte.",
    gradient: "linear-gradient(135deg,#003860,#000c18)",
    link: "https://www.google.com/maps/search/?api=1&query=Stand+Up+Paddle+Copacabana+Rio+de+Janeiro",
  },
  "Forte Duque de Caxias": {
    imgs: [
      "/imgs/forte/forte-1.jpg",
      "/imgs/forte/forte-2.jpg",
      "/imgs/forte/forte-3.jpeg",
    ],
    onde: "Praça Almirante Júlio de Noronha – Leme",
    preco: "R$ 4",
    curiosidade: "Construído em 1776 para defender a entrada da Baía de Guanabara de invasores pelo mar, o Forte Duque de Caxias guarda o extremo norte de Copacabana, no Leme. Do alto das suas muralhas você tem uma das vistas mais espetaculares de toda a cidade: de um lado, a extensão inteira da praia de Copacabana com suas ondas e o calçadão de mosaico; do outro, o mar aberto do Atlântico. O forte ainda está em atividade — é gerenciado pelo Exército Brasileiro — mas é aberto à visitação. Por R$ 4, é disparado o melhor custo-benefício turístico do Rio.",
    gradient: "linear-gradient(135deg,#3a2a00,#0e0800)",
    link: "https://www.google.com/maps/search/?api=1&query=Forte+Duque+de+Caxias+Leme+Rio+de+Janeiro",
  },
  "Sunset Morro da Urca": {
    imgs: [
      "/imgs/urca/urca-1.jpeg",
      "/imgs/arpoador/arpoador-4.jpeg",
      "/imgs/arpoador/arpoador-5.jpeg",
    ],
    onde: "Praia Vermelha – Urca",
    preco: "Gratuito (trilha) ou R$ 195 (teleférico)",
    curiosidade: "O Morro da Urca é o primeiro dos dois morros do Pão de Açúcar — e a trilha que sobe por ele já foi usada como rota de fuga durante a ditadura militar. Hoje é uma das trilhas mais democratizadas do Rio: leva cerca de 40 minutos no ritmo tranquilo, passa pela Mata Atlântica e chega a uma plataforma com vista de 360° da cidade. Ao cair da tarde, o sol banha o Rio inteiro em tons dourados e a Baía de Guanabara vira um espelho laranja. Subindo pela trilha (gratuita) você vai a pé até o primeiro morro; para chegar ao segundo (Pão de Açúcar de verdade), precisa do teleférico de lá.",
    gradient: "linear-gradient(135deg,#5a2a00,#180800)",
    link: "https://www.google.com/maps/search/?api=1&query=Morro+da+Urca+Rio+de+Janeiro",
    linkPagamento: "https://www.bondinho.com.br/",
  },
  "Bar Urca": {
    imgs: [],
    onde: "R. Cândido Gaffrée – Urca",
    preco: "Média R$ 30–60/pessoa",
    curiosidade: "Fundado em 1939, o Bar Urca é Patrimônio Histórico e Cultural do Estado do Rio de Janeiro — e um dos poucos bares do Rio que sobreviveu ao tempo sem perder a essência. Fica à beira do mar da Urca, com mesas na calçada de frente para a Baía de Guanabara. O cardápio tem aquelas delícias cariocas de botequim: bolinhos de bacalhau que derretem na boca, peixe frito, caldinho de feijão. A clientela mistura moradores do bairro, turistas e celebridades — todo mundo se sente em casa no Bar Urca.",
    gradient: "linear-gradient(135deg,#1a1a4a,#050510)",
    link: "https://www.google.com/maps/search/?api=1&query=Bar+Urca+Rio+de+Janeiro",
  },
  "Rio Scenarium": {
    imgs: [
      "/imgs/scenarium/scenarium-1.jpeg",
      "/imgs/scenarium/scenarium-2.jpeg",
    ],
    onde: "R. do Lavradio, 20 – Centro/Lapa",
    preco: "R$ 45 (sábado)",
    curiosidade: "O Rio Scenarium é um casarão do século XIX com três andares repletos de móveis, objetos e antiguidades garimpados ao longo de décadas — parece um museu que virou bar. Cada andar tem um ambiente diferente: piano ao vivo no térreo, samba no segundo, DJs no terceiro. Já foi eleito um dos melhores bares do mundo pela revista Time Out e recebeu personalidades como o presidente Obama. A Rua do Lavradio, onde fica, é o coração boêmio do Rio tradicional — nos fins de semana, a rua inteira fecha para carros e vira festa.",
    gradient: "linear-gradient(135deg,#3a001a,#0e0008)",
    link: "https://www.google.com/maps/search/?api=1&query=Rio+Scenarium+Lapa+Rio+de+Janeiro",
    linkPagamento: "https://rioscenarium.com.br/",
  },
  "Feira da Glória": {
    imgs: [],
    onde: "Av. Augusto Severo – Glória",
    preco: "Gratuito",
    curiosidade: "A Feira da Glória acontece aos domingos e é um dos eventos mais autênticos e democráticos do Rio. Barracas de artesanato, roupas vintage, comida regional e muito samba ao ar livre — a partir das 15h, grupos de samba animam a feira com o tradicional 'pagodão carioca'. Fica no bairro da Glória, entre o Centro e o Flamengo, com vista para a Baía de Guanabara e a Igreja Nossa Senhora da Glória ao fundo. O domingo perfeito para sentir o Rio que não é dos cartões postais — é o Rio de quem mora aqui.",
    gradient: "linear-gradient(135deg,#5a3a00,#180e00)",
    link: "https://www.google.com/maps/search/?api=1&query=Feira+da+Gloria+Rio+de+Janeiro",
  },
  "Aterro do Flamengo": {
    imgs: [
      "/imgs/aterro/aterro-1.webp",
      "/imgs/aterro/aterro-2.jpg",
    ],
    onde: "Parque do Flamengo – Flamengo",
    preco: "Gratuito",
    curiosidade: "O Aterro do Flamengo é o maior parque urbano do Rio de Janeiro, com 1,2 milhão de m² criados a partir de um aterro sobre a Baía de Guanabara nas décadas de 1950 e 60. O projeto paisagístico é de Roberto Burle Marx — o mesmo do calçadão de Copacabana — e é considerado uma das suas obras-primas. Aos domingos, as vias expressas do parque são fechadas para carros e tomadas por ciclistas, skatistas, famílias e cachorros. A vista é generosa: Pão de Açúcar de um lado, Baía de Guanabara do outro, e o bondinho cruzando o céu ao fundo.",
    gradient: "linear-gradient(135deg,#1a3a1a,#050e05)",
    link: "https://www.google.com/maps/search/?api=1&query=Aterro+do+Flamengo+Rio+de+Janeiro",
  },
};

export const DAYS: DayData[] = [
  { num: "0", weekday: "Sábado",  date: "16/02", title: "Voo para o Rio",      sub: "Cuiabá → Rio de Janeiro ✈",             places: [] },
  { num: "1", weekday: "Terça",   date: "17/02", title: "Chegada & Copa",      sub: "Check-in + primeiras aventuras cariocas", places: ["Copacabana Blue Hotel","Pizzaria Oggi","Caminhada em Copacabana","Mureta da Urca"] },
  { num: "2", weekday: "Quarta",  date: "18/02", title: "Zona Sul",             sub: "Natureza, praias e pôr do sol",           places: ["Parque Lage","Jardim Botânico","Ipanema e Leblon","Pôr do sol no Arpoador","Baixo Botafogo"] },
  { num: "3", weekday: "Quinta",  date: "19/02", title: "Centro & Lapa",        sub: "Cultura, história e balada carioca",      places: ["SAARA","Escadaria Selarón","Arcos da Lapa","Museu do Amanhã","AquaRio","Bosque Bar"] },
  { num: "4", weekday: "Sexta",   date: "20/02", title: "Urca & Leme",          sub: "Do mar ao Pão de Açúcar",                places: ["Stand Up Paddle","Forte Duque de Caxias","Sunset Morro da Urca","Bar Urca","Rio Scenarium"] },
  { num: "5", weekday: "Sábado",  date: "21/02", title: "Último Dia",           sub: "Despedida do Rio",                       places: ["Feira da Glória","Aterro do Flamengo"] },
  { num: "6", weekday: "Domingo", date: "22/02", title: "Retorno",              sub: "De volta pra Cuiabá com saudade 🏠",      places: [] },
];

export const COSTS: CostRow[] = [
  { label: "Jardim Botânico",     value: "R$ 40" },
  { label: "Museu do Amanhã",     value: "R$ 40" },
  { label: "AquaRio",             value: "R$ 160" },
  { label: "Forte do Leme",       value: "R$ 4" },
  { label: "Stand Up Paddle",     value: "R$ 180" },
  { label: "Morro da Urca (trilha)", value: "Grátis" },
  { label: "Rio Scenarium",       value: "R$ 45" },
  { label: "Bondinho – descida",  value: "R$ 45" },
  { label: "Total Atrações Pagas", value: "~R$ 514", isTotal: true },
];

export const ALL_CHECKLIST_ITEMS = DAYS.flatMap((d) =>
  d.places.map((p) => ({ name: p, day: `${d.weekday} ${d.date}` }))
);
