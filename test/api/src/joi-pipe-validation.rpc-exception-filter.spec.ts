import { Controller, INestMicroservice, Module, UseFilters, UsePipes } from '@nestjs/common';
import { ClientProxy, ClientsModule, MessagePattern, Transport } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import * as Joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';
import { JoiPipe } from 'nestjs-joi';
import { JoiPipeValidationRpcExceptionFilter } from 'nestjs-joi/microservice';

describe('JoiPipeValidationRpcExceptionFilter functionality', () => {
  class metatype {
    @JoiSchema(Joi.string().valid('default').required())
    prop!: unknown;
  }

  @Controller()
  @UseFilters(new JoiPipeValidationRpcExceptionFilter())
  class AppController {
    @MessagePattern({ cmd: 'test' })
    @UsePipes(
      new JoiPipe({
        usePipeValidationException: true,
      }),
    )
    test(_args: metatype) {
      return 'OK';
    }
  }
  @Module({
    controllers: [AppController],
  })
  class AppModule {}

  let module: TestingModule;
  let app: INestMicroservice;
  let client: ClientProxy;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        AppModule,

        ClientsModule.register([
          {
            name: 'AppService',
            transport: Transport.TCP,
            options: { port: 8766 },
          },
        ]),
      ],
    }).compile();

    app = module.createNestMicroservice({
      transport: Transport.TCP,
      options: {
        port: 8766, // Use specific port
      },
    });

    await app.listen();

    client = app.get<ClientProxy>('AppService');
    await client.connect();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    if (client) {
      client.close();
    }
  });

  it('should return an error object wth the Joi error message', async () => {
    try {
      await client.send({ cmd: 'test' }, { prop: 'invalid' }).toPromise();
      throw new Error('should not be thrown');
    } catch (error: any) {
      expect(error).toEqual({
        error: `Request validation of body failed, because: "prop" must be [default]`,
        message: `Request validation of body failed, because: "prop" must be [default]`,
      });
    }
  });
});
