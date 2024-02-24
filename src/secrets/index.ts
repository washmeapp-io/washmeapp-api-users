import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

interface GetSecretsParams {
  secretName: string;
}

const client = new SecretsManagerClient();

export async function getSecrets(args: GetSecretsParams) {
  try {
    const command = new GetSecretValueCommand({ SecretId: args.secretName });
    const response = await client.send(command);
    const secretString = response.SecretString;
    const secrets = JSON.parse(secretString ?? "{}");
    return secrets;
  } catch (error) {
    console.error("Error retrieving secrets:", error);
    throw error;
  }
}
