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

		// 保存原始发件人和收件人信息
		const originalFrom = message.from;
		const originalTo = message.to;

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
			// 添加原始发件人和收件人作为单独的字段
			originalFrom: originalFrom,
			originalTo: originalTo,
			attachments: [] as {
				filename: string;
				mimeType: string;
				r2Path: string;
				size: number;
			}[],
		};

		// 修改邮件内容，添加原始收件人信息
		const originalToInfo = `\n\n原始接收地址: ${originalTo}`;
		emailData.text = emailData.text + originalToInfo;

		// 如果有HTML内容，也添加到HTML中
		if (emailData.html) {
			emailData.html = emailData.html.replace(
				'</body>',
				`<div style="margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; color: #666;">原始接收地址: ${originalTo}</div></body>`
			);
		}

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
