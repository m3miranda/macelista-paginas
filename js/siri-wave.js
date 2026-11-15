/* ==========================================================================
   SIRI WAVE — porte em JavaScript puro do componente React <SiriWave>
   (variante "wave"). Um triângulo que cobre o canvas inteiro aciona o
   fragment shader; nenhuma biblioteca WebGL envolvida.

   Diferenças em relação ao componente original:
   - O canvas NÃO é quadrado: usa a largura/altura que o CSS der a ele
     (o shader já compensa a proporção).
   - Sem fundo: o shader devolve alpha em vez de preto, então só a luz da
     onda aparece sobre o background da página.
   - Pausa quando a aba está oculta ou o canvas sai da tela, e vira um
     quadro parado para quem usa "reduzir movimento".

   Uso: <canvas class="siri-wave" data-siri-wave></canvas>
   ========================================================================== */
(function () {
  'use strict';

  var ESCALA_RENDER = 0.75;   // resolução interna (menor = mais leve, mais suave)
  var DPR_MAXIMO    = 2;      // teto de densidade de pixels

  var VERTEX = 'attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }';

  /* Shader original, intacto — exceto a última linha do mainImage, que agora
     entrega alpha (ver comentário no fim). */
  var FRAGMENT = `precision highp float;
uniform vec2 iResolution; uniform float iTime;
const float PI = 3.14159265359;
const float AMPLITUDE   = 0.32;
const float FREQ        = 1.1;
const float ABER_FREQ   = 1.0;
const float SPEED       = 2.4;
const float WAVE_SCALE  = 0.6;
const float ABERRATION  = 2.6;
const float THICKNESS   = 3.0;
const float INTENSITY   = 2.;
const float FALLOFF     = 1.7;
const float EDGE_MASK   = 0.4;
const float EDGE_INSET  = 0.0;
const float BAND_FILL   = 30000.0;
const float BAND_THICK  = 0.08;
const float SOFTNESS    = 2.5;
const float LOW_AMP     = 6.0;
const float LOW_INT     = 1.5;
const float MID_ABER    = 0.8;
const float MID_ABAMP   = 0.05;
const float MID_BAND    = 20.0;
const float MID_SOFT    = 0.4;
const float HIGH_ABER   = 0.5;
const float HIGH_ABAMP  = 0.06;
const float RESOLVED    = 1.0;
const float UNRES_SCALE = 0.14;

vec3 spectral4(int s){
    float x = float(s);
    return clamp(vec3(abs(x-3.0)-1.0, 2.0-abs(x-2.0), 2.0-abs(x-4.0)), 0.0, 1.0);
}

/* Paleta da página nova (azul, ciano, índigo, branco azulado) no lugar do
   espectro arco-íris do original, para casar com o azul-marinho do hero. */
vec3 paleta(int s){
    if(s==0) return vec3(0.30,0.50,1.00);
    if(s==1) return vec3(0.40,0.85,1.00);
    if(s==2) return vec3(0.62,0.58,1.00);
    return vec3(0.88,0.93,1.00);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 R = iResolution.xy;
    float aspect = R.x / R.y;
    vec2 p = (fragCoord + 0.5) * 2.0 / R - 1.0;
    p.x *= aspect;
    float yScreen = p.y;
    p /= max(WAVE_SCALE, 0.1);

    float t   = iTime;
    float low  = clamp(0.45 + 0.45*sin(t*0.8)*sin(t*0.37+1.0), 0.0, 1.0);
    float mid  = clamp(0.40 + 0.40*sin(t*1.7+2.0)*sin(t*0.53), 0.0, 1.0);
    float high = clamp(0.30 + 0.30*sin(t*2.9+4.0)*sin(t*0.71+2.0), 0.0, 1.0);

    float res   = clamp(RESOLVED, 0.0, 1.0);
    float drift = mod(t, 20.0*PI) * SPEED;

    float xN  = p.x / max(aspect, 1.0);
    float env = cos(PI*0.5 * min(abs(0.9*xN), 1.0));
    env *= env;

    float A1    = AMPLITUDE + 0.01*low*LOW_AMP;
    float A2    = A1 + mid*MID_ABAMP + high*HIGH_ABAMP;
    float AB    = (ABERRATION + mid*MID_ABER + high*HIGH_ABER)*res;
    float th    = mix(0.1, 0.01*THICKNESS, res);
    float inten = mix(0.1, 0.01*(INTENSITY + low*LOW_INT), res);
    float soft  = 0.01*res*max(0.0, SOFTNESS + mid*MID_SOFT);

    float dUnres = max(length(p) - mix(0.14, UNRES_SCALE, res), 0.0);
    float yMain = A1 * env * res * sin(p.x*FREQ + drift);

    float bandFillTh = max(BAND_THICK, 1e-4);
    float bandAmt    = 1e-4 * BAND_FILL * inten;
    vec3 num = vec3(0.0), den = vec3(0.0);
    for(int s = 0; s < 4; s++){
        vec3 hue = mix(vec3(1.0), paleta(s), res);
        den += hue;
        float ab = mix(-AB, AB, float(s)/3.0);
        float yL = A2 * env * res * sin(p.x*ABER_FREQ + drift + ab);
        float d   = mix(dUnres, abs(p.y - yL), res);
        float lor = mix(1.0/(1.0 + (0.02*d)*(0.02*d)), 1.0, res);
        float line = inten / (sqrt(d*d + soft*soft) + th);
        float lo = min(yMain, yL), hi = max(yMain, yL);
        float dBand = max(0.0, max(p.y - hi, lo - p.y));
        float band  = bandAmt / (dBand + bandFillTh);
        num += hue * lor * (line + band);
    }
    vec3 col = num / den;

    float dM    = mix(dUnres, abs(p.y - yMain), res);
    float lorM  = mix(1.0/(1.0 + (0.02*dM)*(0.02*dM)), 1.0, res);
    float boost = (1.0 - res) * (14.0*low + 4.0);
    col += 0.5 * inten * (lorM + boost) / (sqrt(dM*dM + soft*soft) + th);

    col = pow(max(col, 0.0), vec3(1.5));
    float emT = clamp((abs(yScreen) - 1.0 + EDGE_INSET) / (-max(EDGE_MASK, 1e-4)), 0.0, 1.0);
    float em  = emT*emT*(3.0 - 2.0*emT);
    float gauss = exp(-pow(xN*FALLOFF, 2.0));
    col *= mix(1.0, em*gauss, res);
    col *= res;

    /* Sem fundo: o alpha acompanha o brilho, assim o preto vira transparente
       e a luz se soma ao que estiver atrás (canvas com alpha pré-multiplicado). */
    col = min(col, 1.0);
    float alpha = max(col.r, max(col.g, col.b));
    fragColor = vec4(col, alpha);
}
void main(){ mainImage(gl_FragColor, gl_FragCoord.xy); }`;

  function compilar(gl, tipo, fonte) {
    var shader = gl.createShader(tipo);
    gl.shaderSource(shader, fonte);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(log || 'erro ao compilar shader');
    }
    return shader;
  }

  function iniciar(canvas) {
    var gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      powerPreference: 'low-power'
    });

    /* Sem WebGL: o CSS mostra um brilho estático no lugar (.siri-wave--sem-webgl) */
    if (!gl) { canvas.classList.add('siri-wave--sem-webgl'); return; }

    var programa, vs, fs;
    try {
      vs = compilar(gl, gl.VERTEX_SHADER, VERTEX);
      fs = compilar(gl, gl.FRAGMENT_SHADER, FRAGMENT);
      programa = gl.createProgram();
      gl.attachShader(programa, vs);
      gl.attachShader(programa, fs);
      gl.linkProgram(programa);
      if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(programa) || 'erro ao linkar');
      }
    } catch (e) {
      canvas.classList.add('siri-wave--sem-webgl');
      return;
    }
    gl.useProgram(programa);

    /* um único triângulo cobrindo o canvas inteiro */
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(programa, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    var uResolucao = gl.getUniformLocation(programa, 'iResolution');
    var uTempo     = gl.getUniformLocation(programa, 'iTime');

    gl.clearColor(0, 0, 0, 0);

    /* --- tamanho: segue o CSS, com densidade de pixels limitada --- */
    var largura = 0, altura = 0;

    function redimensionar() {
      var dpr = Math.min(window.devicePixelRatio || 1, DPR_MAXIMO);
      var l = Math.round(canvas.clientWidth  * dpr * ESCALA_RENDER);
      var a = Math.round(canvas.clientHeight * dpr * ESCALA_RENDER);
      if (l === largura && a === altura) return;
      largura = l; altura = a;
      canvas.width = Math.max(1, l);
      canvas.height = Math.max(1, a);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    if ('ResizeObserver' in window) {
      new ResizeObserver(redimensionar).observe(canvas);
    } else {
      window.addEventListener('resize', redimensionar);
    }
    redimensionar();

    /* --- laço de animação --- */
    var inicio = (window.performance || Date).now();
    var quadro = 0;
    var visivel = true;
    var reduzirMovimento = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function desenhar(tempo) {
      if (largura < 1 || altura < 1) return;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uResolucao, canvas.width, canvas.height);
      gl.uniform1f(uTempo, tempo);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function laco() {
      quadro = 0;
      if (!visivel || document.hidden) return;
      desenhar(((window.performance || Date).now() - inicio) / 1000);
      quadro = requestAnimationFrame(laco);
    }

    function retomar() {
      if (reduzirMovimento) { desenhar(2.0); return; }   // um quadro parado
      if (!quadro) laco();
    }

    function pausar() {
      if (quadro) cancelAnimationFrame(quadro);
      quadro = 0;
    }

    /* pausa fora da tela e com a aba oculta: economia de bateria */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entradas) {
        visivel = entradas[0].isIntersecting;
        if (visivel) retomar(); else pausar();
      }, { threshold: 0 }).observe(canvas);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pausar(); else retomar();
    });

    retomar();
  }

  function iniciarTodos() {
    var canvases = document.querySelectorAll('canvas[data-siri-wave]');
    for (var i = 0; i < canvases.length; i++) iniciar(canvases[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarTodos);
  } else {
    iniciarTodos();
  }
})();
