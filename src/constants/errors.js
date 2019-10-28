// Generic Errors
export const ERROR_APP_ID = {code: 1001, message: 'You should provide a valid appId'};
export const ERROR_USER_ID = {code: 1002, message: 'You should provide a valid userId'};
export const ERROR_BODY_PARAMS_MISSING = {code: 1003, message: 'Maybe you forget some body params'};
export const ERROR_USER_NOT_FOUND = {code: 1004, message: 'User not found'};
export const ERROR_DEVICE_ID = {code: 1005, message: 'You should provide a valid userId'};
export const ERROR_DEVICE_NOT_FOUND = {code: 1006, message: 'Device not found'};
export const ERROR_INVALID_TOPIC = {code: 1007, message: 'You should provide a valid topic'};
export const ERROR_TOPIC_NOT_FOUND = {code: 1008, message: 'Topic not found'};

// FCM Errors
export const ERROR_FCM_CREDENTIAL_INVALID_FILE = {code: 5001, message: 'You should provide a file with fcm credential'};
export const ERROR_FCM_INIT = {code: 5002, message: 'Cannot initialice fcm app'};
export const ERROR_FCM_NOT_FOUND = {code: 5003, message: 'FCM client not found'};
export const ERROR_FCM_SENDING_NOTIFICATION = {code: 5004, message: 'FCM client could not send notifications'};

// Mongo errors
export const ERROR_DATABASE = {code: 9001, message: 'Database Error'};
