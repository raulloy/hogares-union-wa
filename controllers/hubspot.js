export const createHubSpotContact = async (
  firstname,
  lastname,
  phone,
  email,
  desarrollo
) => {
  const hubspotClient = new Client({
    accessToken: config.HUBSPOT_ACCESS_TOKEN,
  });

  const properties = {
    firstname,
    lastname,
    phone,
    email,
    desarrollo,
    canal_de_captacion_v2: 'Digital Institucional',
    subcanales_de_captacion: 'Bot_Whatsapp',
  };

  try {
    const response = await axios({
      url: `https://api.hubapi.com/crm/v3/objects/contacts/search`,
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: `Bearer ${config.HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ',
                value: email,
              },
            ],
          },
        ],
        properties: [
          'createdate',
          'firstname',
          'lastname',
          'email',
          'canal_de_captacion',
          'sub_canal_de_captacion',
          'desarrollo',
          'lifecyclestage',
        ],
      },
    });
    // console.log(response.data.results[0]?.properties.email);
    const emailValidation = response.data.results[0]?.properties.email;

    if (email !== emailValidation) {
      const apiResponse = await hubspotClient.crm.contacts.basicApi.create({
        properties,
      });
      console.log('Contact created successfully.');
      return apiResponse;
    } else {
      console.log('Contact is already created');
    }
  } catch (error) {
    console.error(
      `Failed to create contact: ${error.message}`,
      error.response ? JSON.stringify(error.response.status, null, 2) : ''
    );
    throw error;
  }
};
