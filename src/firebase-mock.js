// Este arquivo é um redirecionamento para o firebase.js real
// É útil para testes ou ambientes de desenvolvimento

import { auth, db } from './firebase';

console.warn('Usando firebase-mock.js - Este arquivo apenas redireciona para o firebase.js real');

export { auth, db };