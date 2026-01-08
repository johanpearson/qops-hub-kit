// Import all function endpoints to register them with Azure Functions
import './functions/login.js';
import './functions/get-user.js';
import './functions/list-users.js';
import './functions/upload-file.js';
import './functions/list-files.js';
import './functions/download-file.js';

console.log('Azure Functions registered: login, getUser, listUsers, uploadFile, listFiles, downloadFile');
