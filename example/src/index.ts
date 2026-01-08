// Import all function endpoints to register them with Azure Functions
import './functions/login.js';
import './functions/get-user.js';
import './functions/list-users.js';

console.log('Azure Functions registered: login, getUser, listUsers');
