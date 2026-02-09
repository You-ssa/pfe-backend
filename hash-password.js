const bcrypt = require('bcrypt');

const password = '123456';
bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Erreur:', err);
  } else {
    console.log('Mot de passe hashé:', hash);
    console.log('\nCopiez cette commande SQL dans psql:');
    console.log(`UPDATE patients SET mot_de_passe = '${hash}' WHERE email = 'yossa@example.com';`);
  }
  process.exit();
});