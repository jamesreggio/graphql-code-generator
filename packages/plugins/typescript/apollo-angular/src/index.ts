import { Types, PluginValidateFn, PluginFunction } from '@graphql-codegen/plugin-helpers';
import { visit, GraphQLSchema, concatAST, Kind, FragmentDefinitionNode, OperationDefinitionNode } from 'graphql';
import { RawClientSideBasePluginConfig, LoadedFragment } from '@graphql-codegen/visitor-plugin-common';
import { ApolloAngularVisitor } from './visitor';
import { extname } from 'path';
import gql from 'graphql-tag';

export interface ApolloAngularRawPluginConfig extends RawClientSideBasePluginConfig {
  /**
   * @name ngModule
   * @type string
   * @description Allows to define `ngModule` as part of the plugin's config so it's globally available.
   *
   * @example graphql.macro
   * ```yml
   * config:
   *   ngModule: ./path/to/module#MyModule
   * ```
   */
  ngModule?: string;
  /**
   * @name namedClient
   * @type string
   * @description Defined the global value of `namedClient`.
   *
   * @example graphql.macro
   * ```yml
   * config:
   *   namedClient: 'customName'
   * ```
   */
  namedClient?: string;
  /**
   * @name serviceName
   * @type string
   * @description Defined the global value of `serviceName`.
   *
   * @example graphql.macro
   * ```yml
   * config:
   *   serviceName: 'MySDK'
   * ```
   */
  serviceName?: string;
  /**
   * @name serviceProvidedInRoot
   * @type string
   * @description Defined the global value of `serviceProvidedInRoot`.
   *
   * @example graphql.macro
   * ```yml
   * config:
   *   serviceProvidedInRoot: false
   * ```
   */
  serviceProvidedInRoot?: boolean;
  /**
   * @name sdkClass
   * @type boolean
   * @description Set to `true` in order to generate a SDK service class that uses all generated services.
   * @default false
   *
   */
  sdkClass?: boolean;
}

export const plugin: PluginFunction<ApolloAngularRawPluginConfig> = (schema: GraphQLSchema, documents: Types.DocumentFile[], config) => {
  const allAst = concatAST(documents.map(v => v.document));
  const operations = allAst.definitions.filter(d => d.kind === Kind.OPERATION_DEFINITION) as OperationDefinitionNode[];
  const allFragments: LoadedFragment[] = [
    ...(allAst.definitions.filter(d => d.kind === Kind.FRAGMENT_DEFINITION) as FragmentDefinitionNode[]).map(fragmentDef => ({ node: fragmentDef, name: fragmentDef.name.value, onType: fragmentDef.typeCondition.name.value, isExternal: false })),
    ...(config.externalFragments || []),
  ];

  const visitor = new ApolloAngularVisitor(schema, allFragments, operations, config, documents);
  const visitorResult = visit(allAst, { leave: visitor });

  return {
    prepend: visitor.getImports(),
    content: [visitor.fragments, ...visitorResult.definitions.filter(t => typeof t === 'string'), config.sdkClass ? visitor.sdkClass : null].filter(a => a).join('\n'),
  };
};

export const addToSchema = gql`
  directive @NgModule(module: String!) on OBJECT | FIELD
  directive @namedClient(name: String!) on OBJECT | FIELD
`;

export const validate: PluginValidateFn<any> = async (schema: GraphQLSchema, documents: Types.DocumentFile[], config, outputFile: string) => {
  if (extname(outputFile) !== '.ts') {
    throw new Error(`Plugin "apollo-angular" requires extension to be ".ts"!`);
  }
};

export { ApolloAngularVisitor };
