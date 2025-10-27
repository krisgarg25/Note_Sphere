import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const getApiUrl = () => {
    if (!__DEV__) {
        return 'https://your-production-url.com';
    }

    try {
        if (Constants.expoConfig?.hostUri) {
            const host = Constants.expoConfig.hostUri.split(':')[0];
            return `http://${host}:8081`;
        }

        if (Constants.manifest?.debuggerHost) {
            const host = Constants.manifest.debuggerHost.split(':')[0];
            return `http://${host}:8081`;
        }

        if (Platform.OS === 'android') {
            return 'http://10.0.2.2:8081';
        } else {
            return 'http://localhost:8081';
        }
    } catch (error) {
        return 'http://localhost:8081';
    }
};
