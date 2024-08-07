const { request, expect } = require('@playwright/test');

(async () => {
    const loginEndpoint = 'https://mockapi.rapidextras.com/login';
    const testCases = [
        {
            description: 'Empty Username',
            requestBody: { username: '', password: 'password' },
            expectedStatus: 400,
            expectedMessage: 'Username and password are required.',
        },
        {
            description: 'Invalid Login',
            requestBody: { username: 'invaliduser@example.com', password: 'password' },
            expectedStatus: 401,
            expectedMessage: 'Unauthorized',
        },
        {
            description: 'Malformed JSON Response',
            requestBody: { username: 'malformeduser@example.com', password: 'password' },
            expectedStatus: 400, 
            expectedMessage: 'Malformed JSON', 
        },
        {
            description: 'Server Error',
            requestBody: { username: 'erroruser@example.com', password: 'password' },
            expectedStatus: 500,
            expectedMessage: 'Internal Server Error',
        },
        {
            description: 'Slow Response',
            requestBody: { username: 'slowuser@example.com', password: 'password' },
            expectedStatus: 200,
            expectedMessage: 'Success',
        },
        {
            description: 'Successful Login',
            requestBody: { username: 'validuser@example.com', password: 'password' },
            expectedStatus: 200,
            expectedMessage: 'Success',
        }
    ];

    const apiRequestContext = await request.newContext();

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const maxRetries = 3;

    for (const testCase of testCases) {
        console.log(`Running test case: ${testCase.description}`);

        let response;
        let statusCode;
        let retryCount = 0;
        let responseTime = 0;
        const start = Date.now();

        do {
            if (retryCount > 0) {
                console.log(`Retrying... Attempt ${retryCount}`);
                await delay(2000); // Wait for 2 seconds before retrying
            }
            response = await apiRequestContext.post(loginEndpoint, {
                data: testCase.requestBody,
            });
            statusCode = response.status();
            retryCount++;
        } while (statusCode === 429 && retryCount <= maxRetries);

        const end = Date.now();
        responseTime = end - start;

        // Log and validate response status
        console.log('Response Status Code:', statusCode);
        try {
            expect(statusCode).toBe(testCase.expectedStatus);

            // Validate response body
            const responseBodyText = await response.text(); // Use text() to handle potential non-JSON responses
            console.log('Response Body:', responseBodyText);

            if (responseBodyText.trim() === '') {
                console.log('Response body is empty');
            } else {
                const responseBody = JSON.parse(responseBodyText);

                if (testCase.expectedMessage) {
                    expect(responseBody.error || responseBody.message).toBe(testCase.expectedMessage);
                    console.log('Expected message:', testCase.expectedMessage);
                }
            }
        } catch (error) {
            console.log('Error parsing JSON response:', error);
        }

        // Log response time
        console.log('Response Time:', responseTime, 'ms');

        console.log();

        // Delay between test cases to avoid hitting rate limit
        await delay(1000);
    }

    await apiRequestContext.dispose();
})();
