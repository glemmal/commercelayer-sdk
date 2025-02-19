/* eslint-disable no-console */

import apiSchema, { Resource, Operation, Component, Cardinality } from './schema'
import fs from 'fs'
import path from 'path'
import _ from 'lodash'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Inflector = require('inflector-js')


const templates: { [key: string]: string } = { }

const global: {
	version?: string
} = {}


const loadTemplates = (): void => {
	const tplDir = './gen/templates'
	const tplList = fs.readdirSync(tplDir, { encoding: 'utf-8' }).filter(f => f.endsWith('.tpl'))
	tplList.forEach(t => {
		const tplName = path.basename(t).replace('.tpl', '')
		const tpl = fs.readFileSync(`${tplDir}/${tplName}.tpl`, { encoding: 'utf-8' })
		templates[tplName] = tpl
	})
}


const generate = async () => {

	const schemaPath = 'gen/openapi.json' // await apiSchema.download()
	if (!fs.existsSync(schemaPath)) {
		console.log('Cannot find schema file: ' + schemaPath)
		return
	}

	console.log('Generating SDK resources from schema ' + schemaPath)

	const schema = apiSchema.parse(schemaPath)
	global.version = schema.version

	loadTemplates()

	const resDir = 'src/resources'
	if (fs.existsSync(resDir)) fs.rmdirSync(resDir, { recursive: true })
	fs.mkdirSync(resDir, { recursive: true })


	const resources: { [key: string]: string } = {}

	Object.entries(schema.resources).forEach(([type, res]) => {
		const name = Inflector.pluralize(Inflector.camelize(type))
		const tplRes = generateResource(type, name, res)
		fs.writeFileSync(`${resDir}/${type}.ts`, tplRes)
		resources[type] = name
	})

	updateApiResources(resources)
	updateSdkResources(resources)

	console.log('SDK resources generation completed.\n')
	
}


const findLine = (str: string, lines: string[]): { text: string, index: number, offset: number } => {
	let idx = 0
	for (const l of lines) {
		const i = l.indexOf(str)
		if (i > -1) return { text: l, index: idx, offset: i }
		else idx++
	}
	return { text: '', index: -1, offset: -1 }
}


// eslint-disable-next-line @typescript-eslint/no-unused-vars
const tabsCount = (template: string): number => {
	return template.match(/##__TAB__##/g)?.length || 0
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const tabsString = (num: number): string => {
	let str = ''
	for (let i = 0; i < num; i++) str += '\t'
	return str
}


const updateSdkResources = (resources: { [key: string]: string }): void => {

	const cl = fs.readFileSync('src/commercelayer.ts', { encoding: 'utf-8' })

	const lines = cl.split('\n')

	// Definitions
	const defTplLine = findLine('##__CL_RESOURCES_DEF_TEMPLATE::', lines)
	const defTplIdx = defTplLine.offset + '##__CL_RESOURCES_DEF_TEMPLATE::'.length + 1
	const defTpl = defTplLine.text.substring(defTplIdx)

	const definitions: string[] = []
	Object.entries(resources).forEach(([type, res]) => {
		let def = defTpl
		def = def.replace(/##__TAB__##/g, '\t')
		def = def.replace('##__RESOURCE_TYPE__##', type)
		def = def.replace('##__RESOURCE_CLASS__##', res)
		definitions.push(def)
	})

	const defStartIdx = findLine('##__CL_RESOURCES_DEF_START__##', lines).index + 2
	const defStopIdx = findLine('##__CL_RESOURCES_DEF_STOP__##', lines).index
	lines.splice(defStartIdx, defStopIdx - defStartIdx, ...definitions)


	// Initializations
	const iniTplLine = findLine('##__CL_RESOURCES_INIT_TEMPLATE::', lines)
	const iniTplIdx = iniTplLine.offset + '##__CL_RESOURCES_INIT_TEMPLATE::'.length + 1
	const iniTpl = iniTplLine.text.substring(iniTplIdx)

	const initializations: string[] = []
	Object.entries(resources).forEach(([type, res]) => {
		let ini = iniTpl
		ini = ini.replace(/##__TAB__##/g, '\t')
		ini = ini.replace('##__RESOURCE_TYPE__##', type)
		ini = ini.replace('##__RESOURCE_CLASS__##', res)
		initializations.push(ini)
	})

	const iniStartIdx = findLine('##__CL_RESOURCES_INIT_START__##', lines).index + 2
	const iniStopIdx = findLine('##__CL_RESOURCES_INIT_STOP__##', lines).index
	lines.splice(iniStartIdx, iniStopIdx - iniStartIdx, ...initializations)


	// console.log(definitions)
	// console.log(initializations)

	fs.writeFileSync('src/commercelayer.ts', lines.join('\n'), { encoding: 'utf-8' })

}


const updateApiResources = (resources: { [key: string]: string }): void => {

	const cl = fs.readFileSync('src/api.ts', { encoding: 'utf-8' })

	const lines = cl.split('\n')
	
	// Exports
	const expTplLine = findLine('##__API_RESOURCES_TEMPLATE::', lines)
	const expTplIdx = expTplLine.offset + '##__API_RESOURCES_TEMPLATE::'.length + 1
	const expTpl = expTplLine.text.substring(expTplIdx)

	const exports: string[] = [ copyrightHeader(templates.header) ]
	const types: string[] = [ ]
	Object.entries(resources).forEach(([type, res]) => {
		let exp = expTpl
		exp = exp.replace(/##__TAB__##/g, '\t')
		exp = exp.replace('##__RESOURCE_TYPE__##', type)
		exp = exp.replace('##__RESOURCE_CLASS__##', res)
		exports.push(exp)
		types.push(`\t'${type}'`)
	})

	const expStartIdx = findLine('##__API_RESOURCES_START__##', lines).index + 2
	const expStopIdx = findLine('##__API_RESOURCES_STOP__##', lines).index
	lines.splice(expStartIdx, expStopIdx - expStartIdx, ...exports)

	const typeStartIdx = findLine('##__API_RESOURCE_TYPES_START__##', lines).index + 1
	const typeStopIdx = findLine('##__API_RESOURCE_TYPES_STOP__##', lines).index
	lines.splice(typeStartIdx, typeStopIdx - typeStartIdx, types.join('\n|'))

	const resStartIdx = findLine('##__API_RESOURCE_LIST_START__##', lines).index + 1
	const resStopIdx = findLine('##__API_RESOURCE_LIST_STOP__##', lines).index
	lines.splice(resStartIdx, resStopIdx - resStartIdx, types.join(',\n'))


	fs.writeFileSync('src/api.ts', lines.join('\n'), { encoding: 'utf-8' })

}


const copyrightHeader = (template: string): string => {

	// Header
	const now = new Date()
	const year = String(now.getFullYear())
	const date = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${year}`
	template = template.replace(/##__CURRENT_YEAR__##/g, year)
	template = template.replace(/##__CURRENT_DATE__##/g, date)
	if (global.version) template = template.replace(/##__SCHEMA_VERSION__##/g, global.version)

	return template

}


const generateResource = (type: string, name: string, resource: Resource): string => {

	let res = templates.resource
	const operations: string[] = []

	const resName = name

	const types: Set<string> = new Set()
	const imports: Set<string> = new Set()

	// Header
	res = copyrightHeader(res)


	// Operations
	const qryMod: string[] = []
	Object.entries(resource.operations).forEach(([opName, op]) => {
		const tpl = op.singleton ? templates['singleton'] : templates[opName]
		if (tpl) {
			if (['retrieve', 'list'].includes(opName)) qryMod.push('QueryParams' + _.capitalize(op.singleton ? 'retrieve' : opName))
			const tplOp = templatedOperation(resName, opName, op, tpl)
			operations.push(tplOp.operation)
			tplOp.types.forEach(t => { types.add(t) })
		}
		else console.log('Unknown operation: ' + opName)
	})
	res = res.replace(/##__QUERY_MODELS__##/g, qryMod.join(', '))
	res = res.replace(/##__MODEL_RESOURCE_INTERFACE__##/g, Inflector.singularize(resName))


	// Resource definition
	res = res.replace(/##__RESOURCE_TYPE__##/g, type)
	res = res.replace(/##__RESOURCE_CLASS__##/g, resName)
	if (operations && (operations.length > 0)) res = res.replace(/##__RESOURCE_OPERATIONS__##/g, operations.join('\n\n\t'))

	// Interfaces export
	const typesArray = Array.from(types)
	res = res.replace(/##__EXPORT_RESOURCE_TYPES__##/g, typesArray.join(', '))

	// Interfaces definition
	const modIntf: string[] = []
	const resIntf: string[] = []
	const relTypes: Set<string> = new Set()
	typesArray.forEach(t => {
		const cudSuffix = getCUDSuffix(t)
		resIntf.push(`Resource${cudSuffix}`)
		const tplCmp = templatedComponent(resName, t, resource.components[t])
		tplCmp.models.forEach(m => imports.add(m))
		modIntf.push(tplCmp.component)
		if (cudSuffix) tplCmp.models.forEach(t => relTypes.add(t))
	})
	res = res.replace(/##__MODEL_INTERFACES__##/g, modIntf.join('\n\n\n'))
	res = res.replace(/##__RESOURCE_INTERFACES__##/g, resIntf.join(', '))


	// Relationships definition
	const relTypesArray = Array.from(relTypes).map(i => `type ${i}Rel = ResourceId & { type: '${_.snakeCase(Inflector.pluralize(i))}' }`)
	res = res.replace(/##__RELATIONSHIP_TYPES__##/g, relTypesArray.length ? (relTypesArray.join('\n') + '\n') : '')
	
	// Resources import
	const impResMod: string[] =  Array.from(imports)
		.filter(i => !typesArray.includes(i))	// exludes resource self reference
		.map(i => `import { ${i} } from './${_.snakeCase(Inflector.pluralize(i))}'`)
	const importStr = impResMod.join('\n') + (impResMod.length ? '\n' : '')
	res = res.replace(/##__IMPORT_RESOURCE_MODELS__##/g, importStr)


	return res

}


const templatedOperation = (res: string, name: string, op: Operation, tpl: string): { operation: string, types: string[] } => {

	let operation = tpl
	const types: string[] = []

	operation = operation.replace(/##__OPERATION_NAME__##/g, name)
	operation = operation.replace(/##__RESOURCE_CLASS__##/g, res)

	if (op.requestType) {
		const requestType = op.requestType
		operation = operation.replace(/##__RESOURCE_REQUEST_TYPE__##/g, requestType)
		types.push(requestType)
	}
	if (op.responseType || ['list', 'update', 'create'].includes(name)) {
		const responseType = op.responseType ? op.responseType : Inflector.singularize(res)
		operation = operation.replace(/##__RESOURCE_RESPONSE_TYPE__##/g, responseType)
		types.push(responseType)
	}

	operation = operation.replace(/\n/g, '\n\t')


	return { operation, types }

}


const expType = (type: string): string => {
	switch (type) {
		case 'integer': return 'number'
		default: return type
	}
}


const getCUDSuffix = (name: string): string => {
	const suffixes = ['Update', 'Create', 'Delete']
	let suffix = ''
	if (name) {
		suffixes.some(x => {
			if (name.endsWith(x)) {
				suffix = x
				return true
			}
			return false
		})
	}
	return suffix
}

const isCUDModel = (name: string): boolean => {
	return (name !== undefined) && (getCUDSuffix(name) !== '')
}


const templatedComponent = (res: string, name: string, cmp: Component): { component: string, models: string[] } => {

	const models: string[] = []

	// Attributes
	const attributes = Object.values(cmp.attributes)
	const fields: string[] = []
	attributes.forEach(a => {
		if (!['type', 'id', 'reference', 'reference_origin', 'metadata', 'created_at', 'updated_at'].includes(a.name))
			fields.push(`${a.name}${a.required ? '' : '?'}: ${expType(a.type)}`)
	})
	
	// Relationships
	const relationships = Object.values(cmp.relationships)
	const rels: string[] = []
	relationships.forEach(r => {
		if (r.deprecated) {
			const deprecated = '/**\n\t* @deprecated This field should not be used as it may be removed in the future without notice\n\t*/\n\t'
			rels.push(`${deprecated}${r.name}?: object${(r.cardinality === Cardinality.to_many) ? '[]' : ''}`)
		}
		else {

			let resName = r.type

			if (resName !== 'object') {
				const relStr = isCUDModel(name) ? 'Rel' : ''
				if (r.polymorphic && r.oneOf) {
					resName = r.oneOf.map(o => `${o}${relStr}`).join(' | ')
					models.push(...r.oneOf)
				}
				else {
					resName = Inflector.camelize(Inflector.singularize(r.type))
					models.push(resName)
					resName += relStr
				}
			}

			const req = r.required ? '' : '?'
			const arr = (r.cardinality === Cardinality.to_many) ? '[]' : ''

			if (r.polymorphic && (r.cardinality === Cardinality.to_many)) resName = `(${resName})`

			rels.push(`${r.name}${req}: ${resName}${arr}`)
		
		}
	})


	let component = (fields.length || rels.length) ? templates.model : templates.model_empty
	
	component = component.replace(/##__RESOURCE_MODEL__##/g, name)
	component = component.replace(/##__EXTEND_TYPE__##/g, getCUDSuffix(name))

	const fieldsStr = (fields.length ? '\n\t' : '') + fields.join('\n\t') + (fields.length && rels.length ? '\n' : '')
	const relsStr = rels.join('\n\t') + (rels.length ? '\n' : '')
	component = component.replace(/##__RESOURCE_MODEL_FIELDS__##/g, fieldsStr)
	component = component.replace(/##__RESOURCE_MODEL_RELATIONSHIPS__##/g, relsStr)


	return { component, models }
	
}




generate()