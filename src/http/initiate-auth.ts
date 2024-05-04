import {
  AdminCreateUserCommand,
  AdminCreateUserCommandInput,
  AuthFlowType,
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  InitiateAuthCommandInput,
} from "@aws-sdk/client-cognito-identity-provider";
import {getSecrets} from "../secrets";


export default async function (username: string, context: any) {
  console.log(`Creating InitiateAuthCommandInput request for login process - Request Id ${context.awsRequestId}`);
  const {COGNITO_SECRET_NAME, REGION} = process.env;
  const cognitoSecrets = await getSecrets({secretName: COGNITO_SECRET_NAME!!, region: REGION!!});
  const client = new CognitoIdentityProviderClient({region: REGION!!});

  const signInParams: InitiateAuthCommandInput = {
    AuthFlow: AuthFlowType.CUSTOM_AUTH,
    ClientId: cognitoSecrets["userPoolClientId"],
    AuthParameters: {
      USERNAME: username,
    },
  };

  try {
    const response = await client.send(new InitiateAuthCommand(signInParams));
    console.log(`Login process started successfully for challenge ${response.ChallengeName} - Request Id ${context.awsRequestId}`);
    return {
      statusCode: 200,
      body: JSON.stringify({
        challengeName: response.ChallengeName,
        challengeParameters: response.ChallengeParameters,
        session: response.Session
      }),
    };
  } catch (error: any) {
    if (error.message === "User does not exist.") {
      console.log(`User does not exist, creating new user ${username} - Request Id ${context.awsRequestId}`);
      try {
        const createUserParams: AdminCreateUserCommandInput = {
          UserPoolId: cognitoSecrets["userPoolId"],
          Username: username,
          UserAttributes: [
            {
              Name: "email",
              Value: username,
            },
          ],
          MessageAction: "SUPPRESS", // Use this to prevent sending a confirmation email immediately
        };
        await client.send(new AdminCreateUserCommand(createUserParams));
        console.log(`User created successfully ${username} - Request Id ${context.awsRequestId}`);
        const signInParams: InitiateAuthCommandInput = {
          AuthFlow: AuthFlowType.CUSTOM_AUTH,
          ClientId: cognitoSecrets["userPoolClientId"],
          AuthParameters: {
            USERNAME: username,
          },
        };
        const response = await client.send(
          new InitiateAuthCommand(signInParams)
        );
        return {
          statusCode: 200,
          body: JSON.stringify({
            challengeName: response.ChallengeName,
            challengeParameters: response.ChallengeParameters,
            session: response.Session
          }),
        };
      } catch (createError: any) {
        console.log(
          `Something went wrong trying to create user and sign in ${username} - Request Id ${context.awsRequestId}`
        );
        console.error(createError);
        return {
          statusCode: 400,
          body: JSON.stringify({message: createError.message}),
        };
      }
    } else {
      console.log(`Something went wrong trying to sign in ${username} - Request Id ${context.awsRequestId}`);
      console.error(error);
      return {
        statusCode: 400,
        body: JSON.stringify({message: error.message}),
      };
    }
  }
}
