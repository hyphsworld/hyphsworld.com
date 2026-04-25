document.addEventListener('DOMContentLoaded',()=>{
const el=document.getElementById('player');
if(el){
el.innerHTML='<button onclick="alert(\'Playing HAM\')">PLAY HAM</button>';
}
console.log('Homepage player ready');
});