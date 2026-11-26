// Qué cuenta como aviso importante. La usan la web y el canal de avisos, para que digan lo mismo.
const EU = /Spain|France|Germany|Italy|Netherlands|Belgium|Portugal|Denmark|Sweden|Norway|Finland|Austria|Switzerland|United Kingdom|Ireland|Poland|Czech/i;
export const isImportant = (x) => (x.topic === 'sfn' || x.topic === 'dolor') && (
  x.stage === 'aprobado' || x.stage === 'personas_grande' ||
  (x.kind === 'trial' && EU.test((x.countries || []).join()))
);
export const inSpain = (x) => (x.countries || []).includes('Spain');
