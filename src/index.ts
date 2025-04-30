import PostalMime, { Email } from 'postal-mime';

interface Env {
	R2_BUCKET: R2Bucket;
	APP_API_URL: string;
}

export default {
	async email(message: any, env: Env, ctx: ExecutionContext): Promise<void> {
		let email: Email;

		try {
			email = await PostalMime.parse(message.raw);
		} catch (error) {
			console.error('Failed to parse email:', error);
			return;
		}

		const emailData = {
			from: message.from,
			fromName: email.from.name || '',
			to: message.to,
			subject: email.subject || 'No Subject',
			text: email.text || '',
			html: email.html || '',
			date: email.date || '',
			messageId: email.messageId || '',
			cc: JSON.stringify(email.cc || []), // 抄送人
			replyTo: email.replyTo || '',
			headers: JSON.stringify(email.headers || []),
			attachments: [] as {
				filename: string;
				mimeType: string;
				r2Path: string;
				size: number; // 添加附件大小
			}[],
		};

		if (email.attachments && email.attachments.length > 0) {
			const date = new Date();
			const year = date.getUTCFullYear();
			const month = date.getUTCMonth() + 1;

			for (const attachment of email.attachments) {
				const r2Path = `${year}/${month}/${attachment.filename}`;
				if (env.R2_BUCKET) {
					await env.R2_BUCKET.put(r2Path, attachment.content);
				}

				const size =
					typeof attachment.content === 'string'
						? attachment.content.length // 字符串使用 length
						: attachment.content.byteLength;

				emailData.attachments.push({
					filename: attachment.filename || 'untitled',
					mimeType: attachment.mimeType || 'application/octet-stream',
					r2Path: r2Path,
					size,
				});
			}
		}

		await forwardToApp(env.APP_API_URL, emailData);
	},
};

async function forwardToApp(apiUrl: string, emailData: any): Promise<void> {
	try {
		await fetch(`${apiUrl}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(emailData),
		});
	} catch (error) {
		console.log('Error forwarding email:', error);
	}
}
