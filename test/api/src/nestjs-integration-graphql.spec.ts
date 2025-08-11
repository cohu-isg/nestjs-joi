import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { INestApplication, UsePipes } from '@nestjs/common';
import {
  Args,
  Field,
  GraphQLModule,
  ID,
  InputType,
  Mutation,
  ObjectType,
  OmitType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { Test, TestingModule } from '@nestjs/testing';
import * as Joi from 'joi';
import { JoiSchema, JoiSchemaExtends } from '@cohu-isg/joi-class-decorators';
import { CREATE, JoiPipe, JoiValidationGroups } from 'nestjs-joi';
import request from 'supertest';

describe.skip('NestJS GraphQL integration', () => {
  @ObjectType()
  class Entity {
    @Field(() => ID)
    id!: string;

    @Field({})
    @JoiSchema(Joi.string().valid('default').required())
    @JoiSchema([JoiValidationGroups.CREATE], Joi.string().valid('create').required())
    @JoiSchema([JoiValidationGroups.UPDATE], Joi.string().valid('update').required())
    prop!: string;
  }

  @InputType()
  @JoiSchemaExtends(Entity)
  class CreateEntityInput extends OmitType(Entity, ['id'], InputType) {}

  @Resolver()
  class EntityResolver {
    @Query(() => Entity)
    entity(): Entity {
      return this.getEntity();
    }

    @Mutation(() => Entity)
    create_ConstructorInArgs(@Args('_input', JoiPipe) _input: CreateEntityInput): Entity {
      return this.getEntity();
    }

    @Mutation(() => Entity)
    create_InstanceInArgs(@Args('_input', new JoiPipe()) _input: CreateEntityInput): Entity {
      return this.getEntity();
    }

    @Mutation(() => Entity)
    create_InstanceInArgsWithGroup(
      @Args('_input', new JoiPipe({ group: CREATE })) _input: CreateEntityInput,
    ): Entity {
      return this.getEntity();
    }

    @Mutation(() => Entity)
    @UsePipes(JoiPipe)
    create_ConstructorInUsePipes(@Args('_input') _input: CreateEntityInput): Entity {
      return this.getEntity();
    }

    @Mutation(() => Entity)
    @UsePipes(new JoiPipe())
    create_InstanceInUsePipes(@Args('_input') _input: CreateEntityInput): Entity {
      return this.getEntity();
    }

    @Mutation(() => Entity)
    @UsePipes(new JoiPipe({ group: CREATE }))
    create_InstanceInUsePipesWithGroup(@Args('_input') _input: CreateEntityInput): Entity {
      return this.getEntity();
    }

    @Mutation(() => Entity)
    create_NoPipe(@Args('_input') _input: CreateEntityInput): Entity {
      return this.getEntity();
    }

    private getEntity(): Entity {
      const entity = new Entity();
      entity.id = '1';
      entity.prop = 'newentity';

      return entity;
    }
  }

  let module: TestingModule;
  let app: INestApplication;

  describe('with pipes defined in resolver', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          GraphQLModule.forRoot<ApolloDriverConfig>({
            autoSchemaFile: true,
            driver: ApolloDriver,
          }),
        ],
        providers: [EntityResolver],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    const CASES = [
      {
        title: '@Args(JoiPipe)',
        mutation: 'create_ConstructorInArgs',
        propValue: 'default',
      },
      {
        title: '@Args(new JoiPipe)',
        mutation: 'create_InstanceInArgs',
        propValue: 'default',
      },
      {
        title: '@Args(new JoiPipe(CREATE))',
        mutation: 'create_InstanceInArgsWithGroup',
        propValue: 'create',
      },
      {
        title: '@UsePipes(JoiPipe)',
        mutation: 'create_ConstructorInUsePipes',
        propValue: 'default',
      },
      {
        title: '@UsePipes(new JoiPipe)',
        mutation: 'create_InstanceInUsePipes',
        propValue: 'default',
      },
      {
        title: '@UsePipes(new JoiPipe(CREATE))',
        mutation: 'create_InstanceInUsePipesWithGroup',
        propValue: 'create',
      },
    ];
    for (const { title, mutation, propValue } of CASES) {
      describe(title, () => {
        it('should use the pipe correctly (positive test)', async () => {
          return request(app.getHttpServer())
            .post('/graphql')
            .send({
              operationName: mutation,
              variables: {
                CreateEntityInput: {
                  prop: propValue,
                },
              },
              _query: `
                mutation ${mutation}($CreateEntityInput: CreateEntityInput!) {
                  ${mutation}(_input: $CreateEntityInput) {
                    id
                    prop
                  }
                }
              `,
            })
            .expect((res: any) =>
              expect(res._body).toEqual({
                data: {
                  [mutation]: {
                    id: '1',
                    prop: 'newentity',
                  },
                },
              }),
            );
        });

        it('should use the pipe correctly (negative test)', async () => {
          return request(app.getHttpServer())
            .post('/graphql')
            .send({
              operationName: mutation,
              variables: {
                CreateEntityInput: {
                  prop: 'NOT' + propValue,
                },
              },
              _query: `
                mutation ${mutation}($CreateEntityInput: CreateEntityInput!) {
                  ${mutation}(_input: $CreateEntityInput) {
                    id
                    prop
                  }
                }
              `,
            })
            .expect((res: any) =>
              expect(res._body.errors[0].message).toContain(`"prop" must be [${propValue}]`),
            );
        });
      });
    }
  });

  describe('with app.useGlobalPipes(new JoiPipe)', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          GraphQLModule.forRoot<ApolloDriverConfig>({
            autoSchemaFile: true,
            driver: ApolloDriver,
          }),
        ],
        providers: [EntityResolver],
      }).compile();

      app = module.createNestApplication();
      app.useGlobalPipes(new JoiPipe());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should use the pipe correctly (positive test)', async () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          operationName: 'create_NoPipe',
          variables: {
            CreateEntityInput: {
              prop: 'default',
            },
          },
          _query: `
                mutation create_NoPipe($CreateEntityInput: CreateEntityInput!) {
                  create_NoPipe(_input: $CreateEntityInput) {
                    id
                    prop
                  }
                }
              `,
        })
        .expect((res: any) =>
          expect(res._body).toEqual({
            data: {
              create_NoPipe: {
                id: '1',
                prop: 'newentity',
              },
            },
          }),
        );
    });

    it('should use the pipe correctly (negative test)', async () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          operationName: 'create_NoPipe',
          variables: {
            CreateEntityInput: {
              prop: 'NOT' + 'default',
            },
          },
          _query: `
                mutation create_NoPipe($CreateEntityInput: CreateEntityInput!) {
                  create_NoPipe(_input: $CreateEntityInput) {
                    id
                    prop
                  }
                }
              `,
        })
        .expect((res: any) =>
          expect(res._body.errors[0].message).toContain(`"prop" must be [default]`),
        );
    });
  });

  describe('with app.useGlobalPipes(new JoiPipe(group))', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          GraphQLModule.forRoot<ApolloDriverConfig>({
            autoSchemaFile: true,
            driver: ApolloDriver,
          }),
        ],
        providers: [EntityResolver],
      }).compile();

      app = module.createNestApplication();
      app.useGlobalPipes(new JoiPipe({ group: CREATE }));
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should use the pipe correctly (positive test)', async () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          operationName: 'create_NoPipe',
          variables: {
            CreateEntityInput: {
              prop: 'create',
            },
          },
          _query: `
                mutation create_NoPipe($CreateEntityInput: CreateEntityInput!) {
                  create_NoPipe(_input: $CreateEntityInput) {
                    id
                    prop
                  }
                }
              `,
        })
        .expect((res: any) =>
          expect(res._body).toEqual({
            data: {
              create_NoPipe: {
                id: '1',
                prop: 'newentity',
              },
            },
          }),
        );
    });

    it('should use the pipe correctly (negative test)', async () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          operationName: 'create_NoPipe',
          variables: {
            CreateEntityInput: {
              prop: 'NOT' + 'create',
            },
          },
          _query: `
                mutation create_NoPipe($CreateEntityInput: CreateEntityInput!) {
                  create_NoPipe(_input: $CreateEntityInput) {
                    id
                    prop
                  }
                }
              `,
        })
        .expect((res: any) =>
          expect(res._body.errors[0].message).toContain(`"prop" must be [create]`),
        );
    });
  });
});
