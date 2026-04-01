import {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand,
	HeadBucketCommand,
	CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { lookup } from "mime-types";

export const client = new S3Client({
	credentials: {
		accessKeyId: process.env.LOCAL_S3_ACCESS_KEY_ID!,
		secretAccessKey: process.env.LOCAL_S3_SECRET_ACCESS_KEY!,
	},
	region: process.env.LOCAL_S3_REGION || "us-east-1",
	endpoint: process.env.LOCAL_S3_ENDPOINT!,
	forcePathStyle: true,
});

const ensureBucket = async () => {
	const bucket = process.env.LOCAL_S3_BUCKET!;
	try {
		await client.send(new HeadBucketCommand({ Bucket: bucket }));
		console.log(`S3 bucket "${bucket}" already exists.`);
	} catch (err: any) {
		if (
			err?.$metadata?.httpStatusCode === 404 ||
			err?.name === "NoSuchBucket"
		) {
			await client.send(new CreateBucketCommand({ Bucket: bucket }));
			console.log(`S3 bucket "${bucket}" created.`);
		} else {
			throw err;
		}
	}
};

if (import.meta.prerender) {
	console.info("Skipping S3 bucket check in prerender");
} else {
	ensureBucket().catch((err) =>
		console.error("Failed to ensure S3 bucket:", err)
	);
}

export const putObject = async (key: string, body: Buffer) => {
	return await client.send(
		new PutObjectCommand({
			Bucket: process.env.LOCAL_S3_BUCKET!,
			Key: key,
			Body: body,
			ContentType: lookup(key) || "text/plain",
		})
	);
};

export const getObject = async (key: string) => {
	return await client.send(
		new GetObjectCommand({
			Bucket: process.env.LOCAL_S3_BUCKET!,
			Key: key,
		})
	);
};

export const deleteObject = async (key: string) => {
	return await client.send(
		new DeleteObjectCommand({
			Bucket: process.env.LOCAL_S3_BUCKET!,
			Key: key,
		})
	);
};
