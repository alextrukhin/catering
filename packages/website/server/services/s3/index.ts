import { putObject, getObject, deleteObject } from "./local";
import {
	type Prisma,
	type FileProvider,
	readClient,
	writeClient,
} from "prismaclient";
import { v4 as uuidv4 } from "uuid";
import { lookup } from "mime-types";

export const putObjectToS3 = async (
	input: {
		body: Buffer;
		folder: string;
		originalName: string;
		name?: string;
		uploaderUserId?: number;
		allowOverwrite?: boolean;
		provider?: FileProvider;
	},
	tx: Prisma.TransactionClient = writeClient
) => {
	const provider = input.provider || "LOCAL_S3";
	const name =
		input.name || `${uuidv4()}.${input.originalName.split(".").pop()}`;
	const path = `${input.folder}/${name}`;

	switch (provider) {
		case "LOCAL_S3":
			await putObject(path, input.body);
			break;
		default:
			throw new Error("Unsupported provider");
	}

	const fileExists = await readClient.file.findFirst({
		where: { path, provider },
	});
	if (!input.allowOverwrite && fileExists) {
		throw new Error("File already exists");
	}

	if (fileExists) {
		return await tx.file.update({
			where: { id: fileExists.id },
			data: {
				name: input.originalName,
				path,
				type: lookup(name) || "text/plain",
				size: input.body.length,
			},
		});
	}

	return await tx.file.create({
		data: {
			name: input.originalName,
			path,
			type: lookup(name) || "text/plain",
			size: input.body.length,
			uploader_user_id: input.uploaderUserId ?? null,
			provider,
		},
	});
};

export const getObjectFromS3 = async (
	key: string,
	_provider?: FileProvider
) => {
	const provider = _provider || "LOCAL_S3";

	let object;
	switch (provider) {
		case "LOCAL_S3":
			object = await getObject(key);
			break;
		default:
			throw new Error("Unsupported provider");
	}

	if (!object.Body) {
		throw new Error("File not found");
	}
	return object.Body;
};

export const deleteObjectFromS3 = async (
	key: string,
	_provider?: FileProvider
) => {
	if (typeof key !== "string") {
		throw new Error("Key must be a string");
	}
	const provider = _provider || "LOCAL_S3";

	switch (provider) {
		case "LOCAL_S3":
			await deleteObject(key);
			await writeClient.file.deleteMany({ where: { path: key, provider } });
			break;
		default:
			throw new Error("Unsupported provider");
	}

	return true;
};

export const cleanupS3Files = async () => {
	const files = await writeClient.file.findMany({
		where: { provider: "LOCAL_S3", UserPhoto: { none: {} } },
	});
	if (!files.length) return;
	await Promise.all(
		files.map(async (file) => {
			try {
				if (typeof file.id === "undefined") return;
				await deleteObjectFromS3(file.path, file.provider);
				await writeClient.file.delete({ where: { id: file.id } });
				console.log("Deleted file", file.path);
			} catch (e) {
				console.error("Error deleting file", file.path, e);
			}
		})
	);
};
