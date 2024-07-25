async function sendPushNotification(pushToken, title, body) {
    const fetch = (await import('node-fetch')).default;

    const message = {
        to: pushToken,
        sound: 'default',
        title: title,
        body: body,
        data: { message: body },
    };

    await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
    });
}

module.exports = sendPushNotification;
